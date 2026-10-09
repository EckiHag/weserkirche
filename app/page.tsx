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

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 rounded-2xl bg-blue-950 p-6 text-white shadow-lg sm:p-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-200">Kirchengemeinden im Personalplanungsraum Petershagen</p>
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-200">Friedewalde Petershagen Ovenstädt Buchholz</p>
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-200">Schlüsselburg Heimsen Windheim Lahde</p>

          <h1 className="text-3xl font-bold sm:text-4xl">Unsere Gottesdienste</h1>

          <p className="mt-3 text-lg text-blue-100">Oktober 2026</p>
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

                  return (
                    <article key={`${base.id}-${calculated.startDate}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-l-4 border-blue-600 p-6 sm:p-8">
                        <p className="text-sm font-semibold text-blue-700">{datumFormatieren(calculated.startDate)}</p>

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
