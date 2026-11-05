import test from 'node:test';
import assert from 'node:assert/strict';
import {isValidBirthDate,isValidBirthTime,isValidBirthPhone,validateBirthGuess} from '../game-birth-validation.mjs';

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
test('WhatsApp com celular e DDD válido',()=>{
  assert.equal(isValidBirthPhone('(11) 99999-9999'),true);
  assert.equal(isValidBirthPhone('1133334444'),false);
  assert.equal(isValidBirthPhone('00999999999'),false);
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
test('bloqueia nome e telefone incompletos antes de abrir confirmação',()=>{
  assert.match(validateBirthGuess({...valid,name:'Ana'}),/nome e sobrenome/i);
  assert.match(validateBirthGuess({...valid,whatsapp:'11 9999'}),/WhatsApp/i);
});
