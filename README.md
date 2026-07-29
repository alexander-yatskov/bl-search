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

#### Option 1: Clone with Git

```sh
git clone https://github.com/<owner>/bl-search.git
cd bl-search
```

Replace `<owner>` with the GitHub account or organization that hosts this
repository.

#### Option 2: Download a ZIP archive

1. Open this repository on GitHub.
2. Click **Code → Download ZIP**.
3. Extract the downloaded archive to a permanent directory.

Do not delete or move the extracted directory while the extension is
installed. Chrome and Brave load the extension directly from it.

#### Load the extension in Brave

1. Open `brave://extensions`.
2. Enable **Developer mode** in the upper-right corner.
3. Click **Load unpacked**.
4. Select the repository's `extension` directory, not the repository root.
5. Pin **BL Search** to the toolbar if you want quick access to settings.
6. Open or reload a LinkedIn Jobs search page.

#### Load the extension in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** in the upper-right corner.
3. Click **Load unpacked**.
4. Select the repository's `extension` directory, not the repository root.
5. Pin **BL Search** to the toolbar if you want quick access to settings.
6. Open or reload a LinkedIn Jobs search page.

The selected directory must contain `manifest.json`:

```text
bl-search/
└── extension/
    ├── manifest.json
    ├── background.js
    ├── content.js
    └── ...
```

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

If you cloned the repository:

```sh
cd /path/to/bl-search
git pull
```

If you downloaded a ZIP archive, download and extract the new version over a
new permanent directory.

After updating files:

1. Open `brave://extensions` or `chrome://extensions`.
2. Find **BL Search**.
3. Click the reload icon.
4. Reload any open LinkedIn Jobs tabs.

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

#### Вариант 1: клонирование через Git

```sh
git clone https://github.com/<owner>/bl-search.git
cd bl-search
```

Замени `<owner>` на GitHub-аккаунт или организацию, в которой опубликован
репозиторий.

#### Вариант 2: загрузка ZIP-архива

1. Открой репозиторий на GitHub.
2. Нажми **Code → Download ZIP**.
3. Распакуй архив в постоянный каталог.

Не удаляй и не перемещай этот каталог, пока расширение установлено. Chrome и
Brave загружают файлы расширения непосредственно из него.

#### Установка в Brave

1. Открой `brave://extensions`.
2. Включи **Developer mode** в правом верхнем углу.
3. Нажми **Load unpacked**.
4. Выбери каталог `extension` внутри репозитория, а не корень репозитория.
5. При желании закрепи **BL Search** на панели браузера для быстрого доступа к
   настройкам.
6. Открой или перезагрузи страницу поиска LinkedIn Jobs.

#### Установка в Chrome

1. Открой `chrome://extensions`.
2. Включи **Developer mode** в правом верхнем углу.
3. Нажми **Load unpacked**.
4. Выбери каталог `extension` внутри репозитория, а не корень репозитория.
5. При желании закрепи **BL Search** на панели браузера.
6. Открой или перезагрузи страницу поиска LinkedIn Jobs.

В выбранном каталоге должен находиться `manifest.json`:

```text
bl-search/
└── extension/
    ├── manifest.json
    ├── background.js
    ├── content.js
    └── ...
```

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

Если репозиторий был клонирован:

```sh
cd /path/to/bl-search
git pull
```

Если использовался ZIP-архив, скачай новую версию и распакуй её в новый
постоянный каталог.

После обновления файлов:

1. Открой `brave://extensions` или `chrome://extensions`.
2. Найди **BL Search**.
3. Нажми кнопку перезагрузки расширения.
4. Перезагрузи открытые вкладки LinkedIn Jobs.

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
