document.addEventListener('DOMContentLoaded', () => {
	const musicPlayer = document.getElementById('music-player');
	const audio = document.getElementById('audio-source');
	const playPauseBtn = document.getElementById('play-pause-btn');
	const prevBtn = document.getElementById('prev-btn');
	const nextBtn = document.getElementById('next-btn');
	const progressBar = document.getElementById('progress-bar');
	const progress = document.getElementById('progress');
	const songTitle = document.getElementById('song-title');
	const artistName = document.getElementById('artist-name');
	const albumCover = document.getElementById('album-cover');
	const volumeBtn = document.getElementById('volume-btn');
	const volumeSlider = document.getElementById('volume-slider');

	let songs = [];
	let currentSongIndex = 0;
	let isPlaying = false;
	let lastVolume = 1;

	function loadSong(song) {
		songTitle.textContent = song.title;
		artistName.textContent = song.artist;
		audio.src = song.src;
		albumCover.src = song.cover;
	}

	function playSong() {
		isPlaying = true;
		const icon = playPauseBtn.querySelector('i');
		icon.classList.remove('fa-play');
		icon.classList.add('fa-pause');
		albumCover.classList.add('playing');
		const playPromise = audio.play();
		if (playPromise !== undefined) {
			playPromise.catch((error) => {
				// 自动播放失败，暂停歌曲以同步UI状态
				pauseSong();
			});
		}
	}

	function pauseSong() {
		isPlaying = false;
		audio.pause();
		const icon = playPauseBtn.querySelector('i');
		icon.classList.remove('fa-pause');
		icon.classList.add('fa-play');
		albumCover.classList.remove('playing');
	}

	function togglePlayPause() {
		if (isPlaying) {
			pauseSong();
		} else {
			playSong();
		}
	}

	function prevSong() {
		currentSongIndex--;
		if (currentSongIndex < 0) {
			currentSongIndex = songs.length - 1;
		}
		loadSong(songs[currentSongIndex]);
		if (isPlaying) playSong();
	}

	function nextSong() {
		currentSongIndex++;
		if (currentSongIndex > songs.length - 1) {
			currentSongIndex = 0;
		}
		loadSong(songs[currentSongIndex]);
		if (isPlaying) playSong();
	}

	function updateProgress(e) {
		const { duration, currentTime } = e.srcElement;
		if (duration) {
			const progressPercent = (currentTime / duration) * 100;
			progress.style.width = `${progressPercent}%`;
		}
	}

	function setProgress(e) {
		const width = this.clientWidth;
		const clickX = e.offsetX;
		const duration = audio.duration;
		if (duration) {
			audio.currentTime = (clickX / width) * duration;
		}
	}

	function updateVolumeIcon() {
		const icon = volumeBtn.querySelector('i');
		icon.classList.remove('fa-volume-up', 'fa-volume-down', 'fa-volume-mute');

		if (audio.volume > 0.5) {
			icon.classList.add('fa-volume-up');
		} else if (audio.volume > 0) {
			icon.classList.add('fa-volume-down');
		} else {
			icon.classList.add('fa-volume-mute');
		}
	}

	function setVolume() {
		audio.volume = volumeSlider.value;
		updateVolumeIcon();
	}

	function toggleMute() {
		if (audio.volume > 0) {
			lastVolume = audio.volume;
			audio.volume = 0;
			volumeSlider.value = 0;
		} else {
			audio.volume = lastVolume;
			volumeSlider.value = lastVolume;
		}
		updateVolumeIcon();
	}

	// Event Listeners
	playPauseBtn.addEventListener('click', togglePlayPause);
	prevBtn.addEventListener('click', prevSong);
	nextBtn.addEventListener('click', nextSong);
	audio.addEventListener('timeupdate', updateProgress);
	progressBar.addEventListener('click', setProgress);
	audio.addEventListener('ended', nextSong);
	volumeSlider.addEventListener('input', setVolume);
	volumeBtn.addEventListener('click', toggleMute);
	audio.addEventListener('error', (e) => {
		songTitle.textContent = '音频加载失败';
		artistName.textContent = '请检查文件路径';
	});

	musicPlayer.addEventListener('click', (e) => {
		// 防止点击控件时折叠播放器
		if (e.target.closest('.controls, .volume-container, .progress-bar')) {
			return;
		}
		musicPlayer.classList.toggle('collapsed');
	});

	// --- init ---
	async function init() {
		try {
			const response = await fetch('/json/music.json');
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			songs = await response.json();

			if (songs && songs.length > 0) {
				musicPlayer.classList.add('collapsed');
				audio.volume = 0.2;
				volumeSlider.value = 0.2;
				updateVolumeIcon();
				loadSong(songs[currentSongIndex]);
				// 尝试自动播放第一首歌
				playSong();
			} else {
				songTitle.textContent = '播放列表为空';
				artistName.textContent = '请添加歌曲到 music.json';
			}
		} catch (e) {
			console.error('无法加载音乐列表: ', e);
			songTitle.textContent = '音频加载失败';
			artistName.textContent = '请检查 music.json 文件';
		}
	}

	init();
});
