use std::fs;
use std::path::Path;
use serde::Serialize;
use std::sync::Mutex;

struct WorkspaceState {
    root: Mutex<String>,
}

#[derive(Serialize, Clone)]
struct FileNode {
    name: String,
    path: String,
    #[serde(rename = "isDirectory")]
    is_directory: bool,
    children: Option<Vec<FileNode>>,
}

#[derive(Serialize)]
struct ReadDirResult {
    tree: Vec<FileNode>,
    #[serde(rename = "rootName")]
    root_name: String,
}

fn build_tree(dir_path: &Path, workspace_root: &str) -> Result<Vec<FileNode>, std::io::Error> {
    let mut nodes = Vec::new();
    if !dir_path.exists() {
        return Ok(nodes);
    }
    for entry in fs::read_dir(dir_path)? {
        let entry = entry?;
        let full_path = entry.path();
        let file_name = entry.file_name().to_string_lossy().into_owned();
        
        if file_name == "node_modules" || file_name == ".git" || file_name == ".DS_Store" {
            continue;
        }

        let metadata = entry.metadata()?;
        let is_dir = metadata.is_dir();
        
        let relative_path = match full_path.strip_prefix(workspace_root) {
            Ok(p) => format!("/{}", p.to_string_lossy()),
            Err(_) => format!("/{}", file_name),
        };

        if is_dir {
            let children = build_tree(&full_path, workspace_root).ok();
            nodes.push(FileNode {
                name: file_name,
                path: relative_path,
                is_directory: true,
                children,
            });
        } else {
            nodes.push(FileNode {
                name: file_name,
                path: relative_path,
                is_directory: false,
                children: None,
            });
        }
    }
    nodes.sort_by(|a, b| {
        if a.is_directory != b.is_directory {
            b.is_directory.cmp(&a.is_directory)
        } else {
            a.name.cmp(&b.name)
        }
    });
    Ok(nodes)
}

#[tauri::command]
fn native_read_directory(state: tauri::State<'_, WorkspaceState>) -> Result<ReadDirResult, String> {
    let root_str = state.root.lock().unwrap();
    let root_path = Path::new(&*root_str);
    let root_name = root_path.file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| root_str.clone());
    let tree = build_tree(root_path, &*root_str).map_err(|e| e.to_string())?;
    Ok(ReadDirResult { tree, root_name })
}

#[tauri::command]
fn native_read_file(path: String, state: tauri::State<'_, WorkspaceState>) -> Result<String, String> {
    let root_str = state.root.lock().unwrap();
    let root_path = Path::new(&*root_str);
    let rel_path = path.strip_prefix("/").unwrap_or(&path);
    let full_path = root_path.join(rel_path);

    if !full_path.starts_with(root_path) {
        return Err("Access denied: outside workspace root".to_string());
    }

    fs::read_to_string(full_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn native_read_binary_file(path: String, state: tauri::State<'_, WorkspaceState>) -> Result<Vec<u8>, String> {
    let root_str = state.root.lock().unwrap();
    let root_path = Path::new(&*root_str);
    let rel_path = path.strip_prefix("/").unwrap_or(&path);
    let full_path = root_path.join(rel_path);

    if !full_path.starts_with(root_path) {
        return Err("Access denied: outside workspace root".to_string());
    }

    fs::read(full_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn native_write_file(path: String, content: String, state: tauri::State<'_, WorkspaceState>) -> Result<(), String> {
    let root_str = state.root.lock().unwrap();
    let root_path = Path::new(&*root_str);
    let rel_path = path.strip_prefix("/").unwrap_or(&path);
    let full_path = root_path.join(rel_path);

    if !full_path.starts_with(root_path) {
        return Err("Access denied: outside workspace root".to_string());
    }

    if let Some(parent) = full_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }

    fs::write(full_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn native_select_directory(state: tauri::State<'_, WorkspaceState>) -> Result<Option<String>, String> {
    let dialog = rfd::FileDialog::new()
        .set_title("Select Workspace Folder")
        .pick_folder();
    
    if let Some(path) = dialog {
        let path_str = path.to_string_lossy().to_string();
        let mut root = state.root.lock().unwrap();
        *root = path_str.clone();
        Ok(Some(path_str))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn native_delete_path(path: String, state: tauri::State<'_, WorkspaceState>) -> Result<(), String> {
    let root_str = state.root.lock().unwrap();
    let root_path = Path::new(&*root_str);
    let rel_path = path.strip_prefix("/").unwrap_or(&path);
    let full_path = root_path.join(rel_path);

    if !full_path.starts_with(root_path) {
        return Err("Access denied: outside workspace root".to_string());
    }

    if full_path.is_dir() {
        fs::remove_dir_all(full_path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(full_path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn native_rename_path(old_path: String, new_path: String, state: tauri::State<'_, WorkspaceState>) -> Result<(), String> {
    let root_str = state.root.lock().unwrap();
    let root_path = Path::new(&*root_str);
    
    let rel_old = old_path.strip_prefix("/").unwrap_or(&old_path);
    let full_old = root_path.join(rel_old);

    let rel_new = new_path.strip_prefix("/").unwrap_or(&new_path);
    let full_new = root_path.join(rel_new);

    if !full_old.starts_with(root_path) || !full_new.starts_with(root_path) {
        return Err("Access denied: outside workspace root".to_string());
    }

    fs::rename(full_old, full_new).map_err(|e| e.to_string())
}

#[tauri::command]
fn native_create_directory(path: String, state: tauri::State<'_, WorkspaceState>) -> Result<(), String> {
    let root_str = state.root.lock().unwrap();
    let root_path = Path::new(&*root_str);
    let rel_path = path.strip_prefix("/").unwrap_or(&path);
    let full_path = root_path.join(rel_path);

    if !full_path.starts_with(root_path) {
        return Err("Access denied: outside workspace root".to_string());
    }

    fs::create_dir_all(full_path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(WorkspaceState {
      root: Mutex::new("/Users/danny/Desktop/apify".to_string()),
    })
    .invoke_handler(tauri::generate_handler![
      native_read_directory,
      native_read_file,
      native_read_binary_file,
      native_write_file,
      native_select_directory,
      native_delete_path,
      native_rename_path,
      native_create_directory
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
