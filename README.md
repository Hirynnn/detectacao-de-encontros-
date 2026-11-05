# Detecção de encontros por geolocalização

Aplicação em Node.js e TypeScript que identifica proximidade física entre registros de pessoas monitoradas, considerando timestamp, facção e relações de medida protetiva.

## Requisitos

- Node.js 20 ou superior (usa `fetch` nativo).
- npm.

## Instalação e execução

```sh
npm install
npm run build
npm run download
npm start
```

Os sete arquivos de resposta estão incluídos em `outputs/`. Os datasets originais e as respostas de referência não são versionados: além de desnecessários para executar os testes, os datasets são muito grandes. Para gerar os resultados novamente, baixe os dados com `npm run download` (são vários arquivos grandes) ou coloque os datasets em `datasets/`; então execute `npm start` para processar os sete arquivos e gravar `outputs/respostas1.json` até `respostas7.json`.

Para processar somente um arquivo:

```sh
npm run build
npm run process -- datasets/dataset1.txt
```

Outros comandos:

- `npm test`: compila e executa os testes unitários nativos do Node.
- `npm run validate`: compara os resultados dos datasets 1 e 2 com as respostas oficiais.
- `npm run download`: baixa datasets e referências oficiais.

## Organização

```text
src/
  detector.ts    agrupamento temporal e busca espacial/classificação
  download.ts    download dos dados oficiais
  haversine.ts   distância esférica em metros
  index.ts       entrada da CLI e escrita dos JSONs
  parser.ts      parser CSV delimitado por ponto e vírgula
  types.ts       tipos compartilhados
  validate.ts    comparação com respostas de referência
  detector.test.ts
datasets/        arquivos oficiais (não versionados)
outputs/         respostas JSON geradas e incluídas na entrega
```

## Regras e decisões técnicas

O parser lê o arquivo linha a linha, remove espaços externos e aceita campos opcionais vazios. IDs numéricos seguros são emitidos como números; os demais permanecem texto. Coordenadas fora dos limites geográficos, indicadores booleanos desconhecidos, timestamp vazio e linhas incompletas geram erro com número da linha, em vez de serem silenciosamente ignorados. IDs restritos aceitam separação por vírgula, barra vertical ou espaços.

A distância é calculada pela Fórmula de Haversine com raio terrestre de 6.371.000 m. O encontro existe somente para distância estritamente menor que 20 m. Registros são comparados apenas dentro do mesmo timestamp literal após retirar espaços externos; timestamps diferentes não são aproximados nem normalizados.

Para reduzir pares candidatos sem perder encontros em latitudes altas, cada posição é projetada em coordenadas cartesianas 3D sobre a esfera terrestre e inserida em uma grade com células de 20 m. São verificadas a célula ocupada e as 26 vizinhas; toda combinação candidata ainda passa pelo cálculo exato de Haversine. Assim, a grade não decide o encontro nem substitui a verificação de distância. Cada par de IDs é canonicalizado para evitar duplicidade por ordem, e cada categoria é emitida uma única vez.

Cada par elegível gera uma única categoria: `protetiva` quando um dos registros é uma vítima com medida protetiva ativa e a restrição inclui o ID do outro monitorado; caso contrário, `faccao` quando ambos têm a mesma facção não vazia; nos demais casos, `generico`. Essa precedência segue as respostas oficiais de referência, nas quais encontros específicos não são repetidos como genéricos.

## Validação

`npm run validate` compara chaves de categoria, timestamp e IDs sem considerar a ordem dos IDs, e imprime verdadeiros positivos, falsos positivos, falsos negativos, duplicidades, divergências de coordenadas/distância, score F1 e tempo. Coordenadas são comparadas exatamente; a distância tolera diferença de até `1e-9` m. O relatório exibe divergências por chave para investigação.

Os datasets e as referências oficiais não estão incluídos no repositório. Para validar, execute `npm run download` e depois `npm run validate`; o download depende de acesso à internet ao bucket S3. A solução foi comparada com as referências oficiais dos datasets 1 e 2: ambos tiveram correspondência completa, sem falsos positivos, falsos negativos, duplicidades ou divergências de coordenadas e distância.

## Limites conhecidos

O parser é streaming, mas o detector mantém grupos por timestamp para suportar entradas fora de ordem. Portanto, o pico de memória depende do tamanho total do arquivo. A grade espacial reduz drasticamente comparações em distribuição geográfica esparsa; em áreas extremamente densas, muitos pares ainda precisam ser verificados para garantir precisão. Quando mais de uma categoria se aplica ao mesmo par, o detector emite apenas a categoria mais específica, conforme confirmado pelas referências dos datasets 1 e 2.
