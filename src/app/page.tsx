import { loadConfig } from "@/lib/config.server";
import PlanetView from "@/components/PlanetView";

export default async function HomePage() {
    const earth = await loadConfig();

    return <PlanetView config={earth}/>
}
