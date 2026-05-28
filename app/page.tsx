import Map from "./components/Map";

export default function Home() {
  return (
    <main className="flex-1">
      <h1 className="text-2xl p-4 font-bold">Cornelias karta</h1>
      <div className="h-screen overflow-hidden rounded-xl flex">
        <Map />
      </div>
    </main>
  );
}
