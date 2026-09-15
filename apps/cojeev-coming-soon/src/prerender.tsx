import * as React from 'react';
import {renderToString} from 'react-dom/server';
import {Demo} from './bond-demo';
export function renderPage(mode:'light'|'dark') {
 return renderToString(<React.StrictMode><Demo initialMode={mode}/></React.StrictMode>);
}
