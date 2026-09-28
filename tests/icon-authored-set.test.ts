import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {Icon,iconNames} from "../registry/cojeev/ui/icon";

const known=new Set(iconNames);
const generated=/lucide-icon-(data|names)\.ts$|icon-data\.ts$|specimen-api\.generated\.ts$/;
const sources=(directory:string):string[]=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const file=path.join(directory,entry.name);
  return entry.isDirectory()?sources(file):/\.tsx?$/.test(entry.name)&&!generated.test(file)?[file]:[];
});
const literal=(node:ts.Node):node is ts.StringLiteral|ts.NoSubstitutionTemplateLiteral=>ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node);
const named=(node:ts.Node|undefined,pattern:RegExp)=>!!node&&(ts.isIdentifier(node)||ts.isStringLiteral(node))&&pattern.test(node.text);

/**
 * Names the source hands to an icon: the `name` of an Icon or AnimatedIcon, any `icon`-named prop or key,
 * an argument to an icon-named helper, or a list made only of icon names.
 * ponytail: syntactic, so a name that reaches an icon through other data escapes it; scanning the static
 * export for stroke-less `data-slot="icon"` SVGs is the complete check.
 */
function iconNamesInSource(){
  const found=new Map<string,string>();
  const collect=(node:ts.Node,file:ts.SourceFile)=>{
    // `glyph === "hand" ? "pointer" : …` renders "pointer"; the compared value is not a rendered name.
    if(ts.isBinaryExpression(node)&&[ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken,ts.SyntaxKind.EqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsToken].includes(node.operatorToken.kind))return;
    if(literal(node)&&known.has(node.text)&&!found.has(node.text))found.set(node.text,`${path.relative(".",file.fileName)}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line+1}`);
    ts.forEachChild(node,child=>collect(child,file));
  };
  for(const directory of ["app","components","registry"])for(const fileName of sources(directory)){
    const file=ts.createSourceFile(fileName,fs.readFileSync(fileName,"utf8"),ts.ScriptTarget.Latest,true,fileName.endsWith("x")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    const visit=(node:ts.Node):void=>{
      if(ts.isJsxAttribute(node)&&node.initializer){
        const element=node.parent.parent;
        if(named(node.name,/icon/i)||(node.name.getText(file)==="name"&&named(element.tagName,/Icon$/)))collect(node.initializer,file);
      }
      else if(ts.isPropertyAssignment(node)&&named(node.name,/icon/i))collect(node.initializer,file);
      else if(ts.isCallExpression(node)&&named(node.expression,/icon/i))node.arguments.forEach(argument=>collect(argument,file));
      else if(ts.isArrayLiteralExpression(node)&&node.elements.length>1&&node.elements.every(element=>literal(element)&&known.has(element.text)))collect(node,file);
      ts.forEachChild(node,visit);
    };
    visit(file);
  }
  return found;
}

// Runs in its own process, so the lazily loaded Lucide pack is absent, as it is when a page is exported.
test("every icon name rendered statically by app, components and registry is in the authored set",()=>{
  const found=iconNamesInSource();
  assert.ok(found.has("paintbrush")&&found.has("briefcase")&&found.has("folder-open"),"the scan reaches literal, data and conditional names");
  const blank=[...found].filter(([name])=>!/<(path|circle|rect|line|polyline|polygon|ellipse) /.test(renderToStaticMarkup(createElement(Icon,{name,feedback:false}))));
  assert.deepEqual(blank.map(([name,where])=>`${name} (${where})`),[],"these names render without strokes until the Lucide pack loads; add them to icon-data.ts");
});
