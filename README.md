# Scanner QR

Aplicativo em React Native, Expo SDK 57 e TypeScript para leitura, interpretação e
organização de QR Codes em Android e iOS.

## Recursos

- Onboarding exibido somente no primeiro acesso.
- Leitor com câmera traseira, recorte de enquadramento, lanterna e tratamento de erros.
- Redes Wi-Fi: identifica nome, segurança, senha e rede oculta.
- Pix: reconhece chaves avulsas e códigos Pix estáticos ou dinâmicos.
- Pix Copia e Cola: mostra recebedor informado, valor, chave, TxId e situação do CRC.
- Links, e-mail, telefone, SMS e localização: abre o aplicativo correspondente quando disponível.
- Conteúdo sem formato específico continua disponível como texto simples.
- Cópia para a área de transferência e avisos quando uma ação externa não estiver disponível.
- Exportação TXT com nome editável e seleção da pasta de destino.
- Histórico persistente e tipado, armazenado localmente com AsyncStorage.
- Opções para pausar o histórico, apagar os dados locais e alternar entre tema claro e escuro.
- Abas nativas no Android e iOS, com respeito às áreas seguras do aparelho.

## Executar

```bash
npm install
npx expo start
```

Use um aparelho físico para validar a câmera e a integração com os ajustes de Wi-Fi. As
dependências usam o Expo SDK 57. O aplicativo não inclui suporte web.

## Verificações

```bash
npx tsc --noEmit
npm run lint
npx expo-doctor
npx expo export --platform android
npx expo export --platform ios
```

## Gerar um APK instalável

O perfil `preview` do arquivo `eas.json` já está configurado para produzir `.apk`.

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

No primeiro build, aceite a criação automática da chave de assinatura quando o EAS solicitar.
Quando o processo terminar, abra o link exibido no terminal para baixar e instalar o APK.
