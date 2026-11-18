import test from 'node:test';
import assert from 'node:assert/strict';
import {isValidBirthDate,isValidBirthTime,isValidBirthPhone,isValidBirthName,normalizeBirthPhone,validateBirthGuess} from '../game-birth-validation.mjs';

const valid={name:'Ana Oliveira',whatsapp:'(11) 99999-9999',date:'2027-01-28',time:'00:00',weight:3250,length:49.5};
test('aceita limites de hora 00:00 e 23:59',()=>{
  assert.equal(isValidBirthTime('00:00'),true);
  assert.equal(isValidBirthTime('23:59'),true);
  for(const value of ['24:00','12:60','8:00','','-1:00'])assert.equal(isValidBirthTime(value),false);
});
test('valida datas reais, não apenas a aparência ISO',()=>{
  assert.equal(isValidBirthDate('2027-01-28'),true);
  assert.equal(isValidBirthDate('2027-02-29'),false);
  assert.equal(isValidBirthDate('2028-02-29'),true);
  assert.equal(isValidBirthDate('2027-13-01'),false);
});
test('telefone com DDD aceita 10 ou 11 dígitos e DDI +55 opcional',()=>{
  for(const phone of ['(11) 99999-9999','11999999999','(11) 3333-4444','1133334444','+55 (11) 3333-4444','+55 (11) 99999-9999','5533334444'])assert.equal(isValidBirthPhone(phone),true,phone);
  assert.equal(normalizeBirthPhone('+55 (11) 3333-4444'),'1133334444');
  assert.equal(normalizeBirthPhone('+55 (11) 99999-9999'),'11999999999');
  for(const phone of ['11 9999','119999999','00999999999','113333444','119999999999','1191234567',''])assert.equal(isValidBirthPhone(phone),false,phone);
});
test('formulário completo válido',()=>assert.equal(validateBirthGuess(valid),''));
test('data anterior ou posterior à DPP continua elegível',()=>{
  assert.equal(validateBirthGuess({...valid,date:'2026-12-26'}),'');
  assert.equal(validateBirthGuess({...valid,date:'2027-02-15'}),'');
});
test('não confirma peso e comprimento fora dos limites',()=>{
  assert.match(validateBirthGuess({...valid,weight:99}),/peso válido/i);
  assert.match(validateBirthGuess({...valid,weight:7001}),/peso válido/i);
  assert.match(validateBirthGuess({...valid,length:19.9}),/comprimento válido/i);
  assert.match(validateBirthGuess({...valid,length:75.1}),/comprimento válido/i);
});
test('permite nome simples sem sobrenome e telefones com 8 ou 9 dígitos após DDD',()=>{
  for(const name of ['Ana','Lu','João','Ana Maria']){assert.equal(isValidBirthName(name),true,name);assert.equal(validateBirthGuess({...valid,name,whatsapp:'(11) 3333-4444'}),'',name)}
  assert.equal(validateBirthGuess({...valid,name:' Ana ',whatsapp:'+55 (11) 99999-9999'}),'');
});

test('bloqueia nome vazio, uma letra e telefone incompleto antes da confirmação',()=>{
  for(const name of ['','A','  '])assert.match(validateBirthGuess({...valid,name}),/nome/i);
  assert.match(validateBirthGuess({...valid,whatsapp:'11 9999'}),/telefone/i);
});
