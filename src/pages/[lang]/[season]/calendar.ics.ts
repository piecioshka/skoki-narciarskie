import type { APIRoute } from 'astro';
import { isLang, LANGUAGES } from '../../../i18n';
import { buildCalendar } from '../../../lib/ics';
import { getSeason, getSeasons } from '../../../lib/seasons';

export function getStaticPaths() {
  return LANGUAGES.flatMap((lang) =>
    getSeasons().map((season) => ({ params: { lang, season: season.id } })),
  );
}

export const GET: APIRoute = ({ params }) => {
  const { lang, season } = params;

  if (!isLang(lang) || !season) {
    return new Response(null, { status: 404 });
  }
  return new Response(buildCalendar(getSeason(season), lang, new Date()), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
