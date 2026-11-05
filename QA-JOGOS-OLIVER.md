# Homologação dos Jogos do Oliver

**Preparação para 04/12/2026** · Testar em desktop e celular (preferencialmente Chrome e Safari).

## Ambientes de teste

- Preview serve para avaliar layout, navegação, calendário, relógio e o diálogo de conferência. **Enviar palpites reais é bloqueado em domínios de Preview**.
- Para testar inscrição, consulta, encerramento, revelação e ranking com dados fictícios, use o **Laboratório dos Jogos** em `/games/teste`.
- Os controles administrativos conectam-se ao Supabase real; não alterar dados, status oficiais ou senhas via Preview sem autorização explícita.
- Para revisão final e promoção manual, seguir `PUBLICACAO-CONTROLADA.md`.

## Cuidados antes de começar
- [ ] Executar cadastros, consulta, encerramento e premiação fictícia apenas em `/games/teste` (laboratório isolado).
- [ ] Não cadastrar palpites de teste nas páginas `/games` ou `/games/online`.
- [ ] Não salvar dados oficiais nem publicar vencedores no ambiente real durante o teste.
- [ ] Conferir o domínio definitivo antes de imprimir o QR Code em `/games/qr`.

## 1. Formulário de nascimento — presencial e online
- [ ] Os quatro cards abrem sem rolagem lateral em 320, 375, 390 e 768 px.
- [ ] Calendário muda de mês, destaca a DPP e impede meses anteriores a janeiro/2020 ou posteriores a dezembro/2099.
- [ ] Relógio acompanha o horário escolhido; permite 00:00 e 23:59, mas não 24:00.
- [ ] Peso e comprimento aceitam ajustes por arrastar, botões e campo numérico, sem quebra no mobile.
- [ ] Nome completo, WhatsApp válido, data, horário, peso e comprimento são verificados antes da confirmação.
- [ ] A confirmação exibe as medidas corretas, permite voltar e não envia ao banco antes do clique definitivo.
- [ ] O envio mostra o comprovante e a consulta exibe os valores salvos.
- [ ] Tentativa de duplicidade não sobrescreve o palpite já registrado.

## 2. Encerramento e revelação — somente laboratório
- [ ] Cadastro de teste é aceito com inscrições abertas.
- [ ] Busca por nome e WhatsApp encontra o registro correto.
- [ ] Após encerrar palpites, novos cadastros são bloqueados, mas a consulta continua.
- [ ] Salvar dados oficiais calcula o ranking privadamente.
- [ ] Resultados e vencedores só aparecem após publicação autorizada.
- [ ] Revisão de empates e horários faltantes apresenta os alertas esperados.

## 3. Casinha do Olie — ambiente real, sem alterar dados
- [ ] A aba de Palpites tem controle de ativação e medida oficial separados.
- [ ] Salvar medida e publicar vencedores são ações diferentes.
- [ ] Botão de publicar exige senha e frase de confirmação.
- [ ] A visão geral leva ao card correto de cada brincadeira.

## 4. Experiência online e impressão
- [ ] Presente é opcional e mensagem/link são alteráveis em Jogos > Visão geral.
- [ ] O link configurado abre corretamente após um cadastro fictício, sem exibir dados privados.
- [ ] O comprovante PNG não contém telefone nem protocolo.
- [ ] O QR Code de `/games/qr` leva ao endereço conferido e tem contraste suficiente no papel.
- [ ] A impressão A4 não inclui ferramentas e botões de edição.
- [ ] Placa A5 (mesa) ocupa uma folha A5 e contém QR Code legível a uma distância confortável.
- [ ] Placa A4 (painel) ocupa uma folha A4 sem cortar título, QR Code, instruções ou rodapé.
- [ ] Em Preview, o modo **Endereço oficial** mantém os links permanentes `https://cha-oliver-mvp.vercel.app/games` e `https://cha-oliver-mvp.vercel.app/games/online`.
- [ ] Em Preview, o modo **Testar Preview** permite verificar a navegação, mas mantém a impressão desabilitada.
- [ ] Testar os dois canais em QR físico, com câmera de outro celular e sem entrar pela URL no navegador.
- [ ] No navegador mobile, testar larguras de 320, 375, 390 e 430 px, sem rolagem horizontal e com botões de pelo menos 44 px.

- [ ] Os resumos de médias permanecem públicos somente de forma agregada.

## Registro de homologação
Anotar data, dispositivo, navegador, comportamento observado, resultado (OK/erro) e captura da tela quando houver problema.

**Critério de conclusão:** sem erros bloqueantes em cadastro, consulta, encerramento e publicação, com QR Code conferido em um aparelho diferente do que o imprimiu.
