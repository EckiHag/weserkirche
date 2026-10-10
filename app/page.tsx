export const dynamic = "force-dynamic";

type Termin = {
  appointment: {
    base: {
      id: number;
      title: string;
      subtitle: string | null;
      description: string | null;
      allDay: boolean;
      calendar: {
        name: string;
      };
    };
    calculated: {
      startDate: string;
      endDate: string;
    };
  };
};

type ChurchToolsResponse = {
  data: Termin[];
  meta?: {
    count: number;
  };
};

function datumFormatieren(datum: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(new Date(datum));
}

function uhrzeitFormatieren(datum: string) {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(datum));
}

// Die Farben wechseln von Datum zu Datum.
// Vollständige Klassennamen, damit Tailwind sie erkennt.
const tagesFarben = [
  {
    hintergrund: "bg-blue-50",
    rand: "border-blue-500",
    text: "text-blue-800",
  },
  {
    hintergrund: "bg-amber-50",
    rand: "border-amber-500",
    text: "text-amber-800",
  },
  {
    hintergrund: "bg-emerald-50",
    rand: "border-emerald-500",
    text: "text-emerald-800",
  },
  {
    hintergrund: "bg-violet-50",
    rand: "border-violet-500",
    text: "text-violet-800",
  },
  {
    hintergrund: "bg-rose-50",
    rand: "border-rose-500",
    text: "text-rose-800",
  },
];

// Datum ohne Uhrzeit – maßgeblich ist die deutsche Zeitzone.
function tagesSchluessel(datum: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(new Date(datum));
}

export default async function ChurchToolsPage() {
  const baseUrl = process.env.CHURCHTOOLS_URL;
  const token = process.env.CHURCHTOOLS_TOKEN;

  let termine: Termin[] = [];
  let fehler: string | null = null;

  if (!baseUrl || !token) {
    fehler = "Die ChurchTools-Zugangsdaten fehlen in .env.local.";
  } else {
    try {
      const url = new URL("/api/calendars/appointments", baseUrl);

      url.searchParams.append("calendar_ids[]", "45");
      url.searchParams.append("calendar_ids[]", "44");
      url.searchParams.append("calendar_ids[]", "54");
      url.searchParams.append("calendar_ids[]", "2");
      url.searchParams.set("from", "2026-10-01");
      url.searchParams.set("to", "2026-12-31");

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Login ${token}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        throw new Error(`ChurchTools antwortet mit HTTP ${response.status}.`);
      }

      const result: ChurchToolsResponse = await response.json();

      if (!Array.isArray(result.data)) {
        throw new Error("Die Antwort enthält keine Terminliste.");
      }

      // Aktuelle Serverzeit pro Anfrage für die Terminfilterung.
      // eslint-disable-next-line react-hooks/purity
      const jetzt = Date.now();

      termine = result.data
        .filter(({ appointment }) => {
          const beginn = new Date(appointment.calculated.startDate).getTime();

          return beginn > jetzt;
        })
        .sort((a, b) => a.appointment.calculated.startDate.localeCompare(b.appointment.calculated.startDate));
    } catch (error) {
      fehler = error instanceof Error ? error.message : "Die Termine konnten nicht geladen werden.";
    }
  }

  // Die Termine sind bereits chronologisch sortiert.
  // Jedes neue Datum bekommt die nächste Farbe.
  const tage = [...new Set(termine.map(({ appointment }) => tagesSchluessel(appointment.calculated.startDate)))];

  const farbenNachDatum = new Map(tage.map((tag, index) => [tag, tagesFarben[index % tagesFarben.length]]));

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 rounded-2xl bg-blue-950 p-6 text-white shadow-lg sm:p-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-200">Kirchengemeinden im Personalplanungsraum Petershagen</p>
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-200">Friedewalde Petershagen Ovenstädt Buchholz</p>
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-200">Schlüsselburg Heimsen Windheim Lahde</p>

          <h1 className="text-3xl font-bold sm:text-4xl">Unsere Gottesdienste</h1>
        </header>

        {fehler ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
            <h2 className="font-semibold">Termine konnten nicht geladen werden</h2>
            <p className="mt-2">{fehler}</p>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-slate-600">
              {termine.length} {termine.length === 1 ? "Gottesdienst" : "Gottesdienste"}
            </p>

            {termine.length === 0 ? (
              <div className="rounded-xl bg-white p-6 shadow-sm">Für diesen Zeitraum sind keine Termine vorhanden.</div>
            ) : (
              <div className="space-y-5">
                {termine.map(({ appointment }) => {
                  const { base, calculated } = appointment;
                  const farbe = farbenNachDatum.get(tagesSchluessel(calculated.startDate)) ?? tagesFarben[0];
                  return (
                    <article key={`${base.id}-${calculated.startDate}`} className={`overflow-hidden rounded-2xl border border-slate-200 shadow-sm ${farbe.hintergrund}`}>
                      <div className={`border-l-4 p-6 sm:p-8 ${farbe.rand}`}>
                        <p className={`text-sm font-semibold ${farbe.text}`}>{datumFormatieren(calculated.startDate)}</p>

                        <h2 className="mt-2 text-xl font-bold sm:text-2xl">{base.title}</h2>

                        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="font-semibold text-slate-500">Uhrzeit</dt>
                            <dd className="mt-1 text-base">
                              {base.allDay ? "Ganztägig / ohne Uhrzeit eingetragen" : `${uhrzeitFormatieren(calculated.startDate)} – ${uhrzeitFormatieren(calculated.endDate)} Uhr`}
                            </dd>
                          </div>

                          {base.subtitle && (
                            <div>
                              <dt className="font-semibold text-slate-500">Ort</dt>
                              <dd className="mt-1 text-base">{base.subtitle}</dd>
                            </div>
                          )}
                        </dl>

                        {base.description && (
                          <details className="mt-6 border-t border-slate-100 pt-4">
                            <summary className="cursor-pointer font-medium text-blue-700">Weitere Informationen und Dienstplan</summary>

                            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{base.description}</p>
                          </details>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        <footer className="mt-8 text-center text-sm text-slate-500">Termine aus ChurchTools · Kalender 45</footer>
      </div>
    </main>
  );
}
