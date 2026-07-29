import AreasEditor from "./AreasEditor";

export default function OrganizacionAreasPage() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="ms-h1">Áreas y subáreas</h1>
        <p className="ms-subtitle">Fuente canónica de la organización: áreas, subáreas y sus objetivos</p>
      </div>
      <AreasEditor />
    </div>
  );
}
