import { Button } from "@/registry/sahajiv/ui/button";
import { Badge } from "@/registry/sahajiv/ui/badge";
import { Card, CardTitle, CardDescription } from "@/registry/sahajiv/ui/card";
export default function Home() {
 return <main style={{maxWidth:960,margin:"64px auto",padding:24}}>
 <Badge variant="pink">SahaJiv UI · building</Badge>
 <h1 style={{fontFamily:"var(--font-display)",fontSize:64,lineHeight:1.05,margin:"24px 0"}}>A considered set<br/>of everyday parts.</h1>
 <p style={{maxWidth:580,marginBottom:32}}>React components with warm surfaces, clear controls, and shared motion. The library is currently in its fidelity spike; the full registry is not yet ready.</p>
 <Card><CardTitle>Phase 0</CardTitle><CardDescription>Button, Badge, and Card are being compared with the authored design system before expanding to all 66 components.</CardDescription><div style={{display:"flex",gap:12,marginTop:24}}><Button variant="accent">Add schedule</Button><Button variant="secondary">View details</Button><Badge variant="olive">In progress</Badge></div></Card>
 </main>;
}
