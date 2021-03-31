import React, { useEffect, useRef, useState } from "https://cdn.esm.sh/react";
import ReactDOM from "https://cdn.esm.sh/react-dom";
import loader from "https://cdn.esm.sh/@monaco-editor/loader";
import type Monaco from "https://cdn.esm.sh/monaco-editor";

declare var document: any;
declare type HTMLElement = any;

declare const DenoProxy: {exec: any};

let monaco: Monaco = null as any;

// @ts-ignore
const vars = (globalThis.__s ??= {});

function useHotState<T>(key: string, initialValue: T) {
  return useState(vars[key] ?? initialValue);
}

function App() {
  const ref = useRef<HTMLElement>(null);
  const [files, setFiles] = useHotState<null | string[]>('files', null);
  const [selectedFile, setSelectedFile] = useHotState<null | string>('selectedFiles', null);

  const [editor, setEditor] = useState<null | any>(null)

  useEffect(() => {
    let disposer: any = null;
    (async () => {
      monaco = await loader.init();
      if (ref.current) {
        const editor = monaco.editor.create(ref.current, {
          lineNumbers: "off",
          theme: "vs-dark",
          fontSize: 16,
          minimap: {
            enabled: false,
          },
        });
        setEditor(editor);
        editor.layout();

        const currentFiles = await DenoProxy.exec("getFiles");
        setFiles(currentFiles);
  
        if (currentFiles.length > 0 && selectedFile == null) {
          const f = currentFiles[0];
          setSelectedFile(f);
        }

        disposer = () => {
          editor.dispose();
        };
      }
    })();
    return () => {
      disposer?.();
    };
  }, []);

  useEffect(() => {
    if (editor == null ) return;
    (async () => {
      if (editor == null ) return;
      if (selectedFile == null ) return;
      const text: string = await DenoProxy.exec("readTextFile", selectedFile);
      let langType;
      if (selectedFile.endsWith('.ts') || selectedFile.endsWith(".tsx")) {
        langType = "typescript"
      }
      else if (selectedFile.endsWith('.html')) {
        langType = "html"
      }
      else if (selectedFile.endsWith('.css')) {
        langType = "css"
      }
      const model = monaco.editor.createModel(text, langType);
      editor.setModel(model);
    })();

    const dispose = editor.addAction({
      id: 'my-save',
      label: 'Save',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S,
      ],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: async (editor: any) => {
        const value = editor.getValue();
        await DenoProxy.exec('writeTextFile', selectedFile, value);
      }
    });
    return () => {
      // console.log("dispose", dispose);
      // dispose();
      dispose.dispose();
    }
  }, [editor, selectedFile]);

  const onClickSave = async (ev: any) => {
    if (editor) {
      const value = editor.getValue();
      await DenoProxy.exec('writeTextFile', selectedFile, value)
      // setSelectedFile(target);
    }
  }

  const onChange = (ev: any) => {
    const target = ev.target.value;
    setSelectedFile(target);
  }

  return (
    <>
      <div style={{
        width: '90%',
        height: '90%',
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      }}>
      {editor == null && <>loading...</>}
      {files &&
        <select value={selectedFile} onChange={onChange}>
          {
            files.map((f: any) => {
              return <option value={f} key={f}>
                {f}
              </option>
              })
            }
          }
        </select>
      }
      <button onClick={onClickSave}>Save self!</button>
        <div style={{ height: "75vh", width: "75vw" }}>
          <div ref={ref} style={{ height: "100%" }}></div>
        </div>

      </div>
    </>
  );
}

export default async () => {
  ReactDOM.render(<App />, document.querySelector(".root"));
};
