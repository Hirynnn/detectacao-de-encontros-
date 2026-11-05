# Detecção de encontros por geolocalização

Aplicação em Node.js e TypeScript que identifica proximidade física entre registros de pessoas monitoradas, considerando timestamp, facção e relações de medida protetiva.

## Requisitos

- Node.js 20 ou superior (usa `fetch` nativo).
- npm.

## Conferir a entrega

```sh
npm install
npm test
```

Os sete resultados pedidos estão prontos em `outputs/respostas1.json` até `outputs/respostas7.json`. Conforme as instruções de entrega, **os datasets de entrada não estão incluídos no repositório**; somente o código-fonte, os arquivos necessários para instalar e testar o projeto e os JSONs de resposta estão versionados.

## Executar novamente com os datasets

Para regenerar os resultados, obtenha os arquivos de entrada fornecidos pela organização e coloque `dataset1.txt` até `dataset7.txt` na pasta `datasets/`. Alternativamente, baixe todos os datasets e as referências oficiais com `npm run download` — esse comando baixa mais de 1 GB de dados. Depois, execute:

```sh
npm install
npm run build
npm start
```

Para processar somente um dataset já colocado em `datasets/`:

```sh
npm run build
npm run process -- datasets/dataset1.txt
```

Outros comandos:

- `npm test`: compila e executa os testes unitários nativos do Node.
- `npm run validate`: compara os resultados dos datasets 1 e 2 com as respostas oficiais; requer os datasets e os JSONs de referência em `datasets/` e `datasets/reference/`.
- `npm run download`: baixa os sete datasets de entrada e as duas referências oficiais; requer acesso à internet e espaço para mais de 1 GB.

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

Os datasets e as referências oficiais não estão incluídos no repositório, conforme as orientações de entrega. Para repetir a validação, obtenha os arquivos e execute `npm run validate`; alternativamente, `npm run download` baixa os arquivos do bucket S3 e requer mais de 1 GB de espaço. A solução foi comparada com as referências oficiais dos datasets 1 e 2: ambos tiveram correspondência completa, sem falsos positivos, falsos negativos, duplicidades ou divergências de coordenadas e distância.

## Limites conhecidos

O parser é streaming, mas o detector mantém grupos por timestamp para suportar entradas fora de ordem. Portanto, o pico de memória depende do tamanho total do arquivo. A grade espacial reduz drasticamente comparações em distribuição geográfica esparsa; em áreas extremamente densas, muitos pares ainda precisam ser verificados para garantir precisão. Quando mais de uma categoria se aplica ao mesmo par, o detector emite apenas a categoria mais específica, conforme confirmado pelas referências dos datasets 1 e 2.
