import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { catalog } from "@/lib/catalog";
import { ThemeControl } from "@/components/theme-control";
import "./docs.css";

export default function Layout({children}:{children:React.ReactNode}){
  return <RootProvider theme={{enabled:false}} search={{enabled:false}}><DocsLayout
    nav={{title:"SahaJiv UI",url:"/"}}
    themeSwitch={{enabled:false}}
    searchToggle={{enabled:false}}
    links={[{type:"custom",children:<ThemeControl/>}]}
    tree={{name:"SahaJiv UI",children:catalog().map(item=>({type:"page",name:item.title,url:`/docs/${item.name}`}))}}
  >{children}</DocsLayout></RootProvider>;
}
