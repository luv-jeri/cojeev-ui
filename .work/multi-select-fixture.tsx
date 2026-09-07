import * as React from "react";
import { createRoot } from "react-dom/client";
import { MultiSelect } from "../registry/sahajiv/ui/multi-select";
import { Button } from "../registry/sahajiv/ui/button";
import { MultiSelectExample } from "../components/examples/forms";
import "./multi-select-fixture.css";
const options=[{value:"design",label:"Design"},{value:"research",label:"Research"},{value:"locked",label:"Compliance",disabled:true}];
function Fixture(){
 const [disabled,setDisabled]=React.useState(false),[submitted,setSubmitted]=React.useState<string[]>([]),[external,setExternal]=React.useState(["external-value"]);
 React.useEffect(()=>{document.documentElement.dataset.ready="1";const toggle=(event:KeyboardEvent)=>{if(event.altKey&&event.key==='d'){event.preventDefault();setDisabled(value=>!value)}};window.addEventListener('keydown',toggle);return()=>window.removeEventListener('keydown',toggle)},[]);
 return <main style={{maxWidth:480,margin:"24px auto",padding:16,display:"grid",gap:28}}>
  <section data-testid="controlled"><MultiSelectExample/></section>
  <form id="skills-form" onSubmit={event=>{event.preventDefault();setSubmitted(new FormData(event.currentTarget).getAll('skills') as string[])}} style={{display:"grid",gap:12}}>
   <MultiSelect label="Skills" name="skills" options={options} defaultValue={["design","locked"]} disabled={disabled} description="Choose your skills."/>
   <div style={{display:"flex",gap:8}}><Button size="sm" type="submit">Read form</Button><Button size="sm" type="reset">Reset form</Button></div>
   <output data-testid="submitted">{JSON.stringify(submitted)}</output>
  </form>
  <MultiSelect label="Archived topics" name="archived" options={options} defaultValue={["design"]} disabled/>
  <MultiSelect label="Required topics" options={options} error="Choose a topic." description="Needed before continuing."/>
  <MultiSelect label="Empty catalog" options={[]}/>
  <MultiSelect label="External values" options={[]} value={external} onValueChange={setExternal}/>
 </main>
}
const host=document.createElement('div');document.body.append(host);createRoot(host).render(<Fixture/>);
