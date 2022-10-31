use std::{
    env::temp_dir,
    io::{BufRead, BufReader, Cursor},
    path::Path,
    process::{Command, Stdio},
};

fn main() {
    println!("[bootstrap] Starting bootstrap process");
    let dir = temp_dir();
    let temp_dir = dir.to_str().expect("Failed to get dir");
    let ffmpeg = include_bytes!("ffmpeg.7z");
    let ffmpeg_path = Path::new(temp_dir).join("ffmpeg.exe");
    if !ffmpeg_path.exists() {
        println!("[bootstrap] Extracting ffmpeg");
        let ffmpeg_decompress =
            sevenz_rust::decompress(Cursor::new(ffmpeg), ffmpeg_path.parent().unwrap());
        if ffmpeg_decompress.is_err() {
            println!("Error: {}", ffmpeg_decompress.err().unwrap());
            panic!("Failed to extract ffmpeg");
        }
        println!("[bootstrap] Extracted ffmpeg");
    }

    println!("[bootstrap] Extracting yt-dlp");
    let ytdlp = include_bytes!("yt-dlp.exe");
    // write bytes to disk
    let ytdlp_path = Path::new(temp_dir).join("yt-dlp.exe");
    if !ytdlp_path.exists() {
        std::fs::write(ytdlp_path.clone(), ytdlp).expect("Failed to write yt-dlp");
    }
    println!("[bootstrap] Extracted yt-dlp");

    let mut argv = std::env::args();
    if !argv.any(|x| x == *"disable-yt-dlp-updates".to_string()) {
        println!("[bootstrap] Updating yt-dlp");
        // Update yt-dlp
        let yt_dlp_update = Command::new(ytdlp_path)
            .args(&["-U"])
            .current_dir(temp_dir)
            .stdout(Stdio::null())
            .spawn();
        if yt_dlp_update.is_err() {
            println!("Error: {}", yt_dlp_update.err().unwrap());
            panic!("Failed to update yt-dlp");
        } else {
            println!("[bootstrap] Updated yt-dlp");
        }
    }

    loop {
        let result = start_node(temp_dir);
        if let Err(code) = result {
            println!("Would you like to restart the node process? (y/n)");

            let mut input = String::new();
            std::io::stdin()
                .read_line(&mut input)
                .expect("Failed to read line");

            if input.trim().to_lowercase() == "y" {
                continue;
            } else if input.trim().to_lowercase() == "n" {
                println!("[bootstrap] Exiting bootstrap process");
                std::process::exit(result.unwrap_or(code));
            } else {
                println!("Would you like to restart the node process? (y/n)");

                input = String::new();
                std::io::stdin()
                    .read_line(&mut input)
                    .expect("Failed to read line");
            }
        } else {
            println!("[bootstrap] Exiting bootstrap process");
            std::process::exit(result.unwrap());
        }
    }
}

fn start_node(temp_dir: &str) -> Result<i32, i32> {
    println!("[bootstrap] Starting node process");
    let mut node_child = Command::new("ytd-node")
        .env("BINARY_PATH", temp_dir)
        .env("NODE_ENV", "production")
        .env("FORCE_COLOR", "true")
        .stdin(Stdio::inherit())
        .stdout(Stdio::piped())
        .spawn()
        .expect("Failed to start node");
    let stdout = node_child.stdout.take().expect("Failed to get stdout");
    let mut stdout_reader = BufReader::new(stdout);
    // Append [node] to each line before printing
    let mut stdout_line = String::new();
    while stdout_reader
        .read_line(&mut stdout_line)
        .expect("Failed to read line")
        > 0
    {
        print!("[node] {}", stdout_line);
        stdout_line.clear();
    }
    let node_exit_status = node_child.wait().expect("Failed to wait for node");
    let code = node_exit_status.code().unwrap();
    println!("[bootstrap] node process exited with code {}", code);

    if node_exit_status.success() {
        Ok(code)
    } else {
        Err(code)
    }
}
