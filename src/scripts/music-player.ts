interface MusicTrack {
	id?: number;
	bvid?: string;
	title: string;
	artist: string;
	src?: string;
	cover: string;
	duration?: number;
	sortOrder?: number;
}

document.addEventListener('DOMContentLoaded', () => {
	if (window.innerWidth <= 768) return;

	const musicPlayer = document.getElementById('music-player')!;
	const audio = document.getElementById('audio-source') as HTMLAudioElement;
	const playPauseBtn = document.getElementById('play-pause-btn')!;
	const prevBtn = document.getElementById('prev-btn')!;
	const nextBtn = document.getElementById('next-btn')!;
	const progressBar = document.getElementById('progress-bar')!;
	const progress = document.getElementById('progress')!;
	const songTitle = document.getElementById('song-title')!;
	const artistName = document.getElementById('artist-name')!;
	const albumCover = document.getElementById('album-cover') as HTMLImageElement;
	const volumeBtn = document.getElementById('volume-btn')!;
	const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;

	let songs: MusicTrack[] = [];
	let currentSongIndex = 0;
	let isPlaying = false;
	let lastVolume = 1;
	let retryCount = 0;
	const MAX_RETRIES = 3;

	function getAudioURL(song: MusicTrack): string {
		if (song.bvid) {
			return (window.API_BASE || '') + '/api/bilibili/audio?bvid=' + encodeURIComponent(song.bvid);
		}
		return (window.API_BASE || '') + (song.src || '');
	}

	function loadSong(song: MusicTrack): void {
		songTitle.textContent = song.title;
		artistName.textContent = song.artist;
		albumCover.src = song.cover;
		audio.src = getAudioURL(song);
		retryCount = 0;
	}

	function playSong(): void {
		isPlaying = true;
		const icon = playPauseBtn.querySelector('i')!;
		icon.classList.remove('fa-play');
		icon.classList.add('fa-pause');
		albumCover.classList.add('playing');
		const playPromise = audio.play();
		if (playPromise !== undefined) {
			playPromise.catch(() => {
				pauseSong();
			});
		}
	}

	function pauseSong(): void {
		isPlaying = false;
		audio.pause();
		const icon = playPauseBtn.querySelector('i')!;
		icon.classList.remove('fa-pause');
		icon.classList.add('fa-play');
		albumCover.classList.remove('playing');
	}

	function togglePlayPause(): void {
		if (isPlaying) {
			pauseSong();
		} else {
			playSong();
		}
	}

	function prevSong(): void {
		currentSongIndex--;
		if (currentSongIndex < 0) {
			currentSongIndex = songs.length - 1;
		}
		loadSong(songs[currentSongIndex]);
		if (isPlaying) playSong();
	}

	function nextSong(): void {
		currentSongIndex++;
		if (currentSongIndex > songs.length - 1) {
			currentSongIndex = 0;
		}
		loadSong(songs[currentSongIndex]);
		if (isPlaying) playSong();
	}

	function updateProgress(e: Event): void {
		const target = e.target as HTMLAudioElement;
		const { duration, currentTime } = target;
		if (duration) {
			const progressPercent = (currentTime / duration) * 100;
			progress.style.width = `${progressPercent}%`;
		}
	}

	function setProgress(this: HTMLElement, e: MouseEvent): void {
		const width = this.clientWidth;
		const clickX = e.offsetX;
		const duration = audio.duration;
		if (duration) {
			audio.currentTime = (clickX / width) * duration;
		}
	}

	function updateVolumeIcon(): void {
		const icon = volumeBtn.querySelector('i')!;
		icon.classList.remove('fa-volume-up', 'fa-volume-down', 'fa-volume-mute');

		if (audio.volume > 0.5) {
			icon.classList.add('fa-volume-up');
		} else if (audio.volume > 0) {
			icon.classList.add('fa-volume-down');
		} else {
			icon.classList.add('fa-volume-mute');
		}
	}

	function setVolume(): void {
		audio.volume = parseFloat(volumeSlider.value);
		updateVolumeIcon();
	}

	function toggleMute(): void {
		if (audio.volume > 0) {
			lastVolume = audio.volume;
			audio.volume = 0;
			volumeSlider.value = '0';
		} else {
			audio.volume = lastVolume;
			volumeSlider.value = String(lastVolume);
		}
		updateVolumeIcon();
	}

	function handleAudioError(): void {
		if (retryCount < MAX_RETRIES) {
			retryCount++;
			const song = songs[currentSongIndex];
			if (song && song.bvid) {
				audio.src = getAudioURL(song);
				if (isPlaying) audio.play();
				return;
			}
		}
		songTitle.textContent = '音频加载失败';
		artistName.textContent = '请检查网络后刷新';
	}

	playPauseBtn.addEventListener('click', togglePlayPause);
	prevBtn.addEventListener('click', prevSong);
	nextBtn.addEventListener('click', nextSong);
	audio.addEventListener('timeupdate', updateProgress);
	progressBar.addEventListener('click', setProgress);
	audio.addEventListener('ended', nextSong);
	volumeSlider.addEventListener('input', setVolume);
	volumeBtn.addEventListener('click', toggleMute);
	audio.addEventListener('error', handleAudioError);

	musicPlayer.addEventListener('click', (e) => {
		if ((e.target as HTMLElement).closest('.controls, .volume-container, .progress-bar')) {
			return;
		}
		musicPlayer.classList.toggle('collapsed');
	});

	async function init(): Promise<void> {
		try {
			const response = await fetch((window.API_BASE || '') + '/api/music');
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			songs = await response.json();

			if (songs && songs.length > 0) {
				musicPlayer.classList.add('collapsed');
				audio.volume = 0.2;
				volumeSlider.value = '0.2';
				updateVolumeIcon();
				loadSong(songs[currentSongIndex]);
				playSong();
			} else {
				songTitle.textContent = '播放列表为空';
				artistName.textContent = '请在管理后台添加歌曲';
			}
		} catch (e) {
			songTitle.textContent = '加载失败';
			artistName.textContent = '请检查网络连接';
		}
	}

	init();
});
