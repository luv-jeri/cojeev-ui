/**
 * The selected specimen's public API.
 *
 * Chapter 05 claims that every object on the bench has a source, so it has to
 * show that object's own information rather than a site-invented stand-in. This
 * renders the real exported props of the selected registry component, extracted
 * from `registry/cojeev/ui/<id>.tsx` at build time by
 * `scripts/generate-specimen-api.mjs`.
 *
 * The data is a static module imported synchronously, so the table is server
 * rendered like the rest of the document: with JavaScript unavailable a visitor
 * still reads the default specimen's API, and selecting another specimen is the
 * only thing that needs script.
 *
 * Each props type gets a real `<table>` with a `<caption>`; the prop name is a
 * row header, so a screen reader announces name/type/description as a unit.
 */
import type { SpecimenArchetype } from "./canonical";
import { SPECIMEN_API } from "./specimen-api.generated";

export function SpecimenApi({ specimen }: { specimen: SpecimenArchetype }) {
  const declarations = SPECIMEN_API[specimen.id] ?? [];

  return (
    <section className="asm-api" aria-labelledby="asm-api-title">
      <h3 className="asm-api__title" id="asm-api-title">
        {specimen.label} public API
      </h3>
      <p className="asm-api__source">
        The exported props of <code>{specimen.id}</code>, extracted from{" "}
        <code>registry/cojeev/ui/{specimen.id}.tsx</code> when this page was built.
        Attributes inherited from the underlying HTML element are not repeated here.
      </p>

      {declarations.length === 0 ? (
        <p className="asm-api__source">
          No exported props type was found for this specimen.
        </p>
      ) : (
        declarations.map((declaration) => (
          <table className="asm-api__table" key={declaration.name}>
            <caption>{declaration.name}</caption>
            <thead>
              <tr>
                <th scope="col">Prop</th>
                <th scope="col">Type</th>
                <th scope="col">Required</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {declaration.props.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    Declares no props of its own; the underlying element&rsquo;s own
                    attributes apply.
                  </td>
                </tr>
              ) : (
                declaration.props.map((prop) => (
                  <tr key={prop.name}>
                    <th scope="row">
                      <code>{prop.name}</code>
                    </th>
                    <td>
                      <code>{prop.type}</code>
                    </td>
                    <td>{prop.required ? "Yes" : "No"}</td>
                    <td>{prop.description || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ))
      )}
    </section>
  );
}
