document.addEventListener('DOMContentLoaded', function (event) {
  try {
    let workingNote = { content: { text: '' } },
      ignoreTextChange = false,
      clientData, cr, lastValue, lastUUID, editor, theme = 'vs'

    function loadComponentRelay() {
      const initialPermissions = [{ name: 'stream-context-item' }]
      cr = new ComponentRelay({
        initialPermissions,
        targetWindow: window,
        onReady: e => {
          document.body.classList.add(cr.platform || '')
          loadEditor()
        },
        handleRequestForContentHeight: e => {
          return undefined
        },
        onThemesChange: e => {
          if (isDarkMode()) {
            theme = 'vs-dark'
            editor && editor.getModel().setTheme(theme)
          } else {
            theme = 'vs'
            editor && editor.getModel().setTheme(theme)
          }
        }
      })

      cr.streamContextItem(note => onReceivedNote(note))
    }

    function saveNote() {
      if (workingNote) {
        // Be sure to capture this object as a variable, as this.note may be reassigned in `streamContextItem`, so by the time
        // you modify it in the presave block, it may not be the same object anymore, so the presave values will not be applied to
        // the right object, and it will save incorrectly.
        let note = workingNote
        cr.saveItemWithPresave(note, () => {
          lastValue = editor.getValue()
          note.content.text = lastValue
          note.clientData = clientData

          // clear previews
          note.content.preview_plain = null
          note.content.preview_html = null
        })
      }
    }

    function onReceivedNote(note) {
      if (note.uuid !== lastUUID) {
        // Note changed, reset last values
        lastValue = null
        lastUUID = note.uuid
      }
      workingNote = note
      // Only update UI on non-metadata updates.
      if (note.isMetadataUpdate) {
        return
      }
      clientData = note.clientData
      if (editor) {
        if (note.content.text !== lastValue) {
          ignoreTextChange = true
          editor.getModel().setValue(workingNote.content.text)
          ignoreTextChange = false
        }
      }
    }

    function loadEditor() {
      const editorEl = document.createElement('editor')
      document.body.append(editorEl)
      // https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs/loader.js
      // https://microsoft.github.io/monaco-editor/node_modules/monaco-editor/dev/vs/loader.js
      require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs' } })
      require(['vs/editor/editor.main'], function () {
        // https://microsoft.github.io/monaco-editor/typedoc/variables/editor.EditorOptions.html
        editor = monaco.editor.create(editorEl, {
          value: workingNote.content.text,
          language: 'markdown',
          lineNumbers: false,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 0,
          minimap: { enabled: false },
          scrollbar: { verticalScrollbarSize: 7, horizontalScrollbarSize: 7, vertical: 'auto', horizontal: 'auto' },
          wordWrap: 'on',
          theme,
          // automaticLayout: true,
        })
        editor.getModel().onDidChangeContent((event) => {
          if (ignoreTextChange) {
            return
          }
          saveNote()
        })
        window.addEventListener('resize', e => editor.layout())
      })
    }

    function isDarkMode() {
      const active = cr.component && cr.component.activeThemes.length ? cr.component.activeThemes[0] : null
      if (active) {
        const themes = [
          'org.standardnotes.theme-focus',
          'org.standardnotes.theme-futura',
          'com.standardnotes.theme-proton'
        ];
        for (let theme of themes) {
          if (active.includes(theme)) {
            return true
          }
        }
      }
      return false
    }

    loadComponentRelay()
  } catch (error) {
    console.warn(error)
  }
})
