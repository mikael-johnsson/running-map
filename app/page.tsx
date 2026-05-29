import Map from "./components/Map";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col">
      <h1 className="shrink-0 p-4 text-2xl font-bold">Cornelias running map</h1>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl">
        <Map />
      </div>
    </main>
  );
}
