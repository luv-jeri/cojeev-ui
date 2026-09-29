// A static stand-in for a documentation page. It sits behind pin mode and the capture scrim in the mockup.
export function HostPage() {
  return (
    <div className="host-page">
      <header className="host-nav">
        <strong>000h</strong>
        <span>Docs</span>
        <span>Components</span>
        <span>Requests</span>
      </header>
      <main className="host-main">
        <h1 id="host-heading">Reading a form value</h1>
        <p id="host-paragraph">
          The example preserves mounted fields between steps, so a value typed on the first step is still there when
          you return to it. Nothing is submitted until the last step.
        </p>
        <div className="host-code">
          <button id="host-copy" type="button">
            Copy code
          </button>
          <pre>
            <code>{'<Form onStepChange={save}>\n  <Field name="email" />\n</Form>'}</code>
          </pre>
        </div>
        <ul>
          <li>Fields keep their order</li>
          <li id="host-item">Attachments keep their order</li>
          <li>Errors appear beside the field</li>
        </ul>
      </main>
    </div>
  );
}
