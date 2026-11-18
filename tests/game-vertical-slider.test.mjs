import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const component=readFileSync(new URL('../game-prediction-widgets.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../games-online.css',import.meta.url),'utf8');

test('comprimento mantém valores 30 a 65 cm no controle vertical',()=>{
 assert.match(component,/className="gameVerticalControl"/);
 assert.match(component,/aria-orientation="vertical"/);
 assert.match(component,/min="300" max="650" step="1"/);
 assert.doesNotMatch(component,/orient="vertical"/);
 assert.match(component,/change\(current-1\)/);
 assert.match(component,/change\(current\+1\)/);
});

test('estilo genérico de range limita apenas o controle horizontal de peso',()=>{
 assert.match(css,/\.olieRemotePredictionGrid \.gameScale>input\[type="range"\]\{/);
 assert.doesNotMatch(css,/\.olieRemotePredictionGrid input\[type="range"\]\{/);
});

test('controle vertical mantém trilho sem limite de largura da coluna',()=>{
 assert.match(css,/\.olieRemotePredictionGrid \.gameVerticalControl input\[type="range"\]\{/);
 assert.match(css,/width:var\(--olie-length-track\)/);
 assert.match(css,/max-width:none/);
 assert.match(css,/transform:rotate\(-90deg\)/);
 assert.match(css,/--olie-length-track:244px/);
 assert.match(css,/--olie-length-track:204px/);
 assert.match(css,/--olie-length-track:188px/);
});
