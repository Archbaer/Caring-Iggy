import { AnimalCreator } from "@/components/animals/animal-creator";
import { getRequiredRoleGroupSession } from "@/lib/auth/server-session";

export default async function NewAnimalPage() {
  await getRequiredRoleGroupSession(["STAFF", "ADMIN"]);

  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Staff workspace</p>
        <h1 className="page-title">Add a new animal.</h1>
        <p className="page-copy">
          Complete the fields below to add a new animal record to the shelter
          catalog.
        </p>
      </section>

      <AnimalCreator />
    </div>
  );
}
