# BL Search

[English](#english) · [Русский](#русский)

## English

BL Search is an experimental Chrome/Brave extension that improves LinkedIn
Jobs search results:

- hides jobs from companies in your personal blocklist;
- groups similar postings from the same company;
- combines locations found in grouped postings;
- optionally synchronizes an end-to-end encrypted blocklist between devices.

This is a beta version distributed through GitHub. It is not currently
available in the Chrome Web Store.

### Install the local beta

#### Recommended: install from GitHub Releases

1. Open the
   [BL Search Releases page](https://github.com/alexander-yatskov/bl-search/releases).
2. Open the latest release and download its extension ZIP from **Assets**.
3. Extract the ZIP into a permanent directory.
4. Open `brave://extensions` in Brave or `chrome://extensions` in Chrome.
5. Enable **Developer mode**.
6. Click **Load unpacked**.
7. Select the extracted directory containing `manifest.json`.
8. Pin **BL Search** to the toolbar.

Do not select the downloaded ZIP itself. Chrome and Brave require an extracted
directory and load the extension files directly from it. Do not delete or move
that directory while the extension is installed.

The extracted release has this structure:

```text
bl-search-extension-vX.Y.Z/
├── manifest.json
├── background.js
├── content.js
└── ...
```

#### Alternative: install from the source repository

This option is intended for development:

```sh
git clone https://github.com/alexander-yatskov/bl-search.git
cd bl-search
```

Open the browser's extensions page, click **Load unpacked**, and select the
`extension` directory inside the cloned repository.

### First run

The settings page opens automatically after installation.

The extension works locally by default and does not require an account, email
address, or cloud connection. You can:

1. Add companies on the settings page.
2. Click **Block company** on a LinkedIn job card.
3. Remove a company with the **Remove** button in settings.
4. Enable or disable duplicate grouping.

### Optional encrypted cloud sync

Click **Create cloud vault** to enable synchronization.

The browser will ask for permission to access the BL Search API. The permission
is requested only after this explicit action, not during installation.

The extension then creates a recovery code:

```text
bls1.<vault-id>.<master-secret>
```

Save this code in a secure place. There is no email recovery: losing the code
means losing access to the cloud vault.

On another device:

1. Install the extension.
2. Open its settings.
3. Expand **Connect another device**.
4. Enter the recovery code.
5. Click **Connect vault**.

The blocklist is encrypted inside the extension before upload. The server does
not receive the plaintext company list or the master secret.

### Update the beta

If you installed from GitHub Releases:

1. Open the
   [BL Search Releases page](https://github.com/alexander-yatskov/bl-search/releases).
2. Download and extract the extension ZIP from the newer release.
3. Replace the files in the directory previously loaded by the browser.
4. Open `brave://extensions` or `chrome://extensions`.
5. Click the reload icon for **BL Search**.

If you cloned the source repository:

```sh
cd /path/to/bl-search
git pull
```

Then reload the extension.

Your local blocklist is stored in browser extension storage and normally
survives an extension reload. Export or preserve the recovery code before
removing the extension.

### Uninstall

1. Open `brave://extensions` or `chrome://extensions`.
2. Find **BL Search**.
3. Click **Remove**.

Removing the extension deletes its local storage. It does not automatically
delete an existing cloud vault. Use **Delete cloud vault** in settings before
uninstalling if you also want to delete the server-side encrypted data.

### Beta limitations

- LinkedIn can change its page structure and temporarily break card detection.
- Duplicate detection currently uses normalized company and job title, so
  distinct openings with the same title can occasionally be grouped together.
- This extension is an independent experimental project and is not affiliated
  with LinkedIn.

### Repository layout

```text
extension/  Chrome/Brave Manifest V3 extension
server/     Go Lambda, DynamoDB storage, and AWS SAM template
```

Additional documentation:

- [Extension internals](extension/README.md)
- [Server and deployment](server/README.md)

---

## Русский

BL Search — экспериментальное расширение для Chrome и Brave, которое улучшает
выдачу LinkedIn Jobs:

- скрывает вакансии компаний из персонального чёрного списка;
- группирует похожие публикации одной компании;
- объединяет регионы найденных дубликатов;
- опционально синхронизирует список между устройствами с оконечным шифрованием
  (end-to-end encryption).

Это бета-версия, распространяемая через GitHub. Сейчас расширение отсутствует в
Chrome Web Store.

### Локальная установка бета-версии

#### Рекомендуемый способ: установка из GitHub Releases

1. Открой
   [страницу релизов BL Search](https://github.com/alexander-yatskov/bl-search/releases).
2. Открой последний релиз и скачай ZIP расширения из секции **Assets**.
3. Распакуй ZIP в постоянный каталог.
4. Открой `brave://extensions` в Brave или `chrome://extensions` в Chrome.
5. Включи **Developer mode**.
6. Нажми **Load unpacked**.
7. Выбери распакованный каталог, внутри которого находится `manifest.json`.
8. Закрепи **BL Search** на панели браузера.

Не выбирай сам ZIP-файл: Chrome и Brave нужен распакованный каталог.
Не удаляй и не перемещай этот каталог, пока расширение установлено — браузер
загружает файлы непосредственно из него.

Структура распакованного релиза:

```text
bl-search-extension-vX.Y.Z/
├── manifest.json
├── background.js
├── content.js
└── ...
```

#### Альтернативный способ: установка из исходного репозитория

Этот вариант предназначен для разработки:

```sh
git clone https://github.com/alexander-yatskov/bl-search.git
cd bl-search
```

Открой страницу расширений, нажми **Load unpacked** и выбери каталог
`extension` внутри клонированного репозитория.

### Первый запуск

После установки страница настроек откроется автоматически.

По умолчанию расширение работает локально и не требует аккаунта, email или
подключения к облаку. Можно:

1. Добавлять компании на странице настроек.
2. Нажимать **Block company** на карточках вакансий LinkedIn.
3. Убирать компании кнопкой **Remove** в настройках.
4. Включать и отключать группировку дубликатов.

### Опциональная зашифрованная синхронизация

Для включения синхронизации нажми **Create cloud vault**.

Браузер запросит разрешение на доступ к API BL Search. Разрешение запрашивается
только после этого явного действия, а не во время установки.

Расширение создаст recovery code:

```text
bls1.<vault-id>.<master-secret>
```

Сохрани его в надёжном месте. Восстановления через email нет: потеря кода
означает потерю доступа к облачному хранилищу.

На другом устройстве:

1. Установи расширение.
2. Открой настройки.
3. Разверни секцию **Connect another device**.
4. Введи recovery code.
5. Нажми **Connect vault**.

Чёрный список шифруется внутри расширения до отправки. Сервер не получает
открытый список компаний или master secret.

### Обновление бета-версии

Если расширение установлено из GitHub Releases:

1. Открой
   [страницу релизов BL Search](https://github.com/alexander-yatskov/bl-search/releases).
2. Скачай и распакуй ZIP расширения из более нового релиза.
3. Замени файлы в каталоге, который ранее был выбран в браузере.
4. Открой `brave://extensions` или `chrome://extensions`.
5. Нажми кнопку перезагрузки **BL Search**.

Если используется клонированный репозиторий:

```sh
cd /path/to/bl-search
git pull
```

После этого перезагрузи расширение.

Локальный чёрный список хранится в хранилище расширения и обычно сохраняется
при его перезагрузке. Перед удалением расширения сохрани recovery code.

### Удаление

1. Открой `brave://extensions` или `chrome://extensions`.
2. Найди **BL Search**.
3. Нажми **Remove**.

Удаление расширения очищает локальное хранилище, но автоматически не удаляет
облачный vault. Если нужно удалить и серверные зашифрованные данные, сначала
используй **Delete cloud vault** в настройках.

### Ограничения бета-версии

- LinkedIn может изменить структуру страницы и временно сломать обнаружение
  карточек.
- Сейчас дедупликация использует нормализованные компанию и название вакансии,
  поэтому разные позиции с одинаковым названием иногда могут объединиться.
- Это независимый экспериментальный проект, не связанный с LinkedIn.

### Структура репозитория

```text
extension/  Расширение Chrome/Brave на Manifest V3
server/     Go Lambda, DynamoDB и AWS SAM template
```

Дополнительная документация:

- [Устройство расширения](extension/README.md)
- [Backend и развёртывание](server/README.md)
