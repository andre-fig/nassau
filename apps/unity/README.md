# Nassau Unity

Cliente Unity inicial do Nassau, separado do cliente Expo existente.

## Abrir

1. Instale Unity `2022.3 LTS` pelo Unity Hub.
2. No Hub, selecione **Add project from disk**.
3. Escolha esta pasta: `apps/unity`.
4. Abra `Assets/Scenes/Main.unity` e pressione Play.

O cliente Unity já contém:

- motor offline portado para C#;
- IA difícil offline;
- carregamento com o vídeo e áudio existentes;
- tela do porto, inventário, seleção, troca, venda e resultado;
- mesma distribuição de 55 itens e encerramento após 3 trilhas esgotadas.

A integração online continuará usando o backend NestJS do monorepo. O cliente Expo permanece disponível até a camada Socket.IO ser portada para o cliente Unity.
