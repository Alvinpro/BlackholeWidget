use std::fs;
use std::path::Path;

/// Delete a file or directory, either permanently or to recycle bin
pub fn delete_file(path: &str, permanent: bool) -> Result<(), String> {
    let path = Path::new(path);
    if !path.exists() {
        return Err(format!("文件不存在: {}", path.display()));
    }

    if permanent {
        if path.is_dir() {
            fs::remove_dir_all(path)
                .map_err(|e| format!("永久删除目录失败 {}: {}", path.display(), e))?;
        } else {
            fs::remove_file(path)
                .map_err(|e| format!("永久删除文件失败 {}: {}", path.display(), e))?;
        }
    } else {
        trash::delete(path)
            .map_err(|e| format!("移到回收站失败 {}: {}", path.display(), e))?;
    }
    Ok(())
}