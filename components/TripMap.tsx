"use client";

import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
} from "maplibre-gl";
import { useEffect, useRef } from "react";

import "maplibre-gl/dist/maplibre-gl.css";

import { useLocale } from "@/components/LocaleProvider";
import type { ResolvedPlace } from "@/lib/places";
import type { Day } from "@/lib/schema";

/**
 * The itinerary's resolved places on a map.
 *
 * Deliberately small: markers, popups, and fitting the view to them. No
 * routing, no travel times, no clustering — those would each need their own
 * data and none of them answer the question this map exists for, which is
 * simply "where are these places in relation to each other".
 *
 * It reuses the coordinates already resolved during place grounding and never
 * calls the geocoder again. A place that did not resolve has no coordinates
 * and therefore no marker: the map shows what is verified, exactly like the
 * itinerary does.
 *
 * Tiles come from OpenFreeMap, which serves OpenStreetMap data as MapLibre
 * vector tiles with no API key, no account and no billing — so there is no
 * credential here to leak or to keep on the server.
 */

/** One marker: a place, and every activity that visits it. */
type MapPoint = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  visits: { day: number; text: string }[];
};

const STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

/** Close enough to read a neighbourhood, without diving into one building. */
const MAX_FIT_ZOOM = 14;

/** Zoom used when there is only one marker and nothing to fit between. */
const SINGLE_POINT_ZOOM = 13;

export default function TripMap({
  days,
  places,
}: {
  days: Day[];
  places: Record<string, ResolvedPlace>;
}) {
  const { t } = useLocale();
  const container = useRef<HTMLDivElement>(null);
  const points = pointsFrom(days, places);

  // The list of markers as a string, so the effect re-runs when the places
  // change but not on every render that rebuilds an equal array.
  const pointsKey = JSON.stringify(points);

  useEffect(() => {
    if (!container.current) return;

    const mapPoints: MapPoint[] = JSON.parse(pointsKey);
    if (mapPoints.length === 0) return;

    const map = new MapLibreMap({
      container: container.current,
      style: STYLES[currentTheme()],
      // A sensible starting view; fitBounds below replaces it immediately.
      center: [mapPoints[0].lon, mapPoints[0].lat],
      zoom: SINGLE_POINT_ZOOM,
      attributionControl: { compact: true },
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    for (const point of mapPoints) {
      new Marker({ element: markerElement(point) })
        .setLngLat([point.lon, point.lat])
        .setPopup(new Popup({ offset: 18 }).setDOMContent(popupContent(point)))
        .addTo(map);
    }

    fitToPoints(map, mapPoints);

    // The container can still be settling when the tab opens, and a map sized
    // against a zero-height box renders blank until something else nudges it.
    map.once("load", () => map.resize());

    // The app switches theme by toggling a class on <html>, which the map
    // cannot see. Swapping the style keeps it in step; markers are DOM
    // overlays and survive the swap.
    //
    // Guarded on the theme actually changing: the observer fires for every
    // class change on <html>, and reloading the style on each one would refetch
    // the whole map and visibly flicker.
    let appliedTheme = currentTheme();

    const observer = new MutationObserver(() => {
      const theme = currentTheme();
      if (theme === appliedTheme) return;

      appliedTheme = theme;
      map.setStyle(STYLES[theme]);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [pointsKey]);

  // Nothing resolved to coordinates. A blank map would look broken, and an
  // arbitrary default view would suggest the trip is somewhere it is not.
  if (points.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-line bg-surface p-8 text-center">
        <p className="text-muted">{t.result.mapEmpty}</p>
      </div>
    );
  }

  return (
    <div
      ref={container}
      // `dir="ltr"` because the map is a canvas with its own controls, and
      // inheriting right-to-left flips their placement and the attribution
      // strip. The surrounding page keeps its own direction.
      dir="ltr"
      className="h-[24rem] w-full overflow-hidden rounded-[1.75rem] border border-line sm:h-[30rem]"
    />
  );
}

/** Whether the app is currently in dark mode. */
function currentTheme(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * A numbered pin, matching the circled day number the itinerary already uses
 * so the two views read as the same trip.
 */
function markerElement(point: MapPoint): HTMLElement {
  const element = document.createElement("button");

  element.type = "button";
  element.title = point.name;
  element.setAttribute("aria-label", point.name);
  element.className =
    "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-primary text-xs font-medium text-primary-fg shadow-md";
  element.textContent = String(point.visits[0]?.day ?? "");

  return element;
}

/**
 * Popup contents, built as DOM rather than an HTML string.
 *
 * The activity text comes from the model, so it is assigned through
 * `textContent` and never parsed as markup.
 */
function popupContent(point: MapPoint): HTMLElement {
  const root = document.createElement("div");
  root.className = "min-w-44 max-w-64 font-sans";

  const name = document.createElement("p");
  name.className = "text-sm font-medium text-ink";
  name.setAttribute("dir", "auto");
  name.textContent = point.name;
  root.append(name);

  const list = document.createElement("ul");
  list.className = "mt-2 space-y-1.5";

  for (const visit of point.visits) {
    const item = document.createElement("li");
    item.className = "flex gap-2 text-xs text-muted";

    const badge = document.createElement("span");
    badge.className =
      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[0.65rem] font-medium text-primary";
    badge.textContent = String(visit.day);

    const text = document.createElement("span");
    text.setAttribute("dir", "auto");
    text.textContent = visit.text;

    item.append(badge, text);
    list.append(item);
  }

  root.append(list);

  return root;
}

/** Frames every marker, or centres on the only one. */
function fitToPoints(map: MapLibreMap, points: MapPoint[]): void {
  if (points.length === 1) {
    map.setCenter([points[0].lon, points[0].lat]);
    map.setZoom(SINGLE_POINT_ZOOM);
    return;
  }

  const bounds = new LngLatBounds();

  for (const point of points) bounds.extend([point.lon, point.lat]);

  map.fitBounds(bounds, { padding: 56, maxZoom: MAX_FIT_ZOOM, animate: false });
}

/**
 * Turns the itinerary into markers.
 *
 * Grouped by place rather than one marker per activity, because a trip that
 * returns to the same place on two days would otherwise stack two markers on
 * the same pixel. The popup lists every visit instead.
 */
function pointsFrom(
  days: Day[],
  places: Record<string, ResolvedPlace>,
): MapPoint[] {
  const byPlace = new Map<string, MapPoint>();

  for (const day of days) {
    for (const activity of day.activities) {
      if (!activity.place) continue;

      const place = places[activity.place];
      if (!place) continue;

      const existing = byPlace.get(place.id);

      if (existing) {
        existing.visits.push({ day: day.day, text: activity.text });
        continue;
      }

      byPlace.set(place.id, {
        id: place.id,
        name: place.name,
        lat: place.lat,
        lon: place.lon,
        visits: [{ day: day.day, text: activity.text }],
      });
    }
  }

  return [...byPlace.values()];
}
