/**
 * Language translations for TauchoPortal
 * Add more languages by following the same structure
 */

const TRANSLATIONS = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.streams': 'Stream Management',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    'nav.profile': 'Profile',
    'nav.accountSettings': 'Account Settings',

    // Streams Page
    'streams.title': 'Stream Management',
    'streams.addStream': '+ Add Stream',
    'streams.backToDashboard': 'Back to Dashboard',
    'streams.yourStreams': 'Your Streams',
    'streams.noStreamSelected': 'No Stream Selected',
    'streams.selectStream': 'Select a stream from the sidebar to view details',

    // Stream Details
    'stream.viewers': 'Viewers',
    'stream.uptime': 'Uptime',
    'stream.healthStatus': 'Health Status',
    'stream.bitrate': 'Bitrate',
    'stream.fps': 'FPS',
    'stream.resolution': 'Resolution',
    'stream.pause': '⸸ Pause',
    'stream.stop': '⹜ Stop',
    'stream.settings': '⚙️ Settings',

    // Stream Info
    'stream.information': 'Stream Information',
    'stream.rtmpUrl': 'RTMP URL:',
    'stream.streamKey': 'Stream Key:',
    'stream.started': 'Started:',
    'stream.recentIssues': 'Recent Issues',
    'stream.noIssuesDetected': 'No issues detected',
    'stream.viewerCount': 'Viewer Count (Last Hour)',
    'stream.chartPlaceholder': '📊 Chart will display viewer trends here',

    // Modal
    'modal.addNewStream': '➕ Add New Stream',
    'modal.selectProvider': 'Select Provider',
    'modal.chooseProvider': 'Choose a provider...',
    'modal.streamName': 'Stream Name',
    'modal.streamNamePlaceholder': 'e.g., Gaming Stream',
    'modal.rtmpUrl': 'RTMP URL',
    'modal.rtmpUrlPlaceholder': 'rtmp://...',
    'modal.streamKey': 'Stream Key',
    'modal.streamKeyPlaceholder': 'Your stream key',
    'modal.addStream': 'Add Stream',
    'modal.streamAdded': 'Stream added! (Backend integration needed)',

    // Alerts
    'alert.copiedToClipboard': 'Copied to clipboard!',
    'alert.pauseStream': 'Pause stream: ',
    'alert.stopStream': 'Stop stream: ',
    'alert.editStream': 'Edit stream: ',

    // Status
    'status.live': '🔴 LIVE',
    'status.offline': '⚪ OFFLINE',
    'status.ended': '⹼️ ENDED',
    'status.excellent': '✅ Excellent',
    'status.completed': 'Completed',

    // Metrics
    'metrics.trendViewers': '+45 in last 5m',
    'metrics.trendStarted': 'Started ',
    'metrics.trendSystemsNormal': 'All systems normal',
    'metrics.trendTarget': 'Target: ',
    'metrics.frameRate': 'Frame rate',
    'metrics.fullHd': 'Full HD',

    // Footer
    'footer.description': 'Stream management made easy',
    'footer.quickLinks': 'Quick Links',
    'footer.about': 'About',
    'footer.help': 'Help & Support',
    'footer.status': 'System Status',
    'footer.legal': 'Legal',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
    'footer.contact': 'Contact',
    'footer.copyright': '© 2026 TauchoPortal. All rights reserved.',
  },

  ja: {
    // ナビゲーション
    'nav.dashboard': 'ダッシュボード',
    'nav.streams': 'ストリーム管理',
    'nav.settings': '設定',
    'nav.logout': 'ログアウト',
    'nav.profile': 'プロフィール',
    'nav.accountSettings': 'アカウント設定',

    // ストリームページ
    'streams.title': 'ストリーム管理',
    'streams.addStream': '+ ストリーム追加',
    'streams.backToDashboard': 'ダッシュボードに戻る',
    'streams.yourStreams': 'あなたのストリーム',
    'streams.noStreamSelected': 'ストリームが選択されていません',
    'streams.selectStream': 'サイドバーからストリームを選択して詳細を表示します',

    // ストリーム詳細
    'stream.viewers': 'ビューアー',
    'stream.uptime': 'アップタイム',
    'stream.healthStatus': 'ヘルスステータス',
    'stream.bitrate': 'ビットレート',
    'stream.fps': 'FPS',
    'stream.resolution': '解像度',
    'stream.pause': '⸸ 一時停止',
    'stream.stop': '⹜ 停止',
    'stream.settings': '⚙️ 設定',

    // ストリーム情報
    'stream.information': 'ストリーム情報',
    'stream.rtmpUrl': 'RTMP URL:',
    'stream.streamKey': 'ストリームキー:',
    'stream.started': '開始:',
    'stream.recentIssues': '最近の問題',
    'stream.noIssuesDetected': '問題は検出されていません',
    'stream.viewerCount': 'ビューアー数（過去1時間）',
    'stream.chartPlaceholder': '📊 グラフがここに表示されます',

    // モーダル
    'modal.addNewStream': '➕ 新しいストリームを追加',
    'modal.selectProvider': 'プロバイダーを選択',
    'modal.chooseProvider': 'プロバイダーを選択...',
    'modal.streamName': 'ストリーム名',
    'modal.streamNamePlaceholder': '例：ゲーミングストリーム',
    'modal.rtmpUrl': 'RTMP URL',
    'modal.rtmpUrlPlaceholder': 'rtmp://...',
    'modal.streamKey': 'ストリームキー',
    'modal.streamKeyPlaceholder': 'あなたのストリームキー',
    'modal.addStream': 'ストリームを追加',
    'modal.streamAdded': 'ストリームが追加されました！（バックエンド統合が必要）',

    // アラート
    'alert.copiedToClipboard': 'クリップボードにコピーしました！',
    'alert.pauseStream': 'ストリームを一時停止: ',
    'alert.stopStream': 'ストリームを停止: ',
    'alert.editStream': 'ストリームを編集: ',

    // ステータス
    'status.live': '🔴 ライブ',
    'status.offline': '⚪ オフライン',
    'status.ended': '⹼️ 終了',
    'status.excellent': '✅ 優秀',
    'status.completed': '完了',

    // メトリクス
    'metrics.trendViewers': '過去5分間に+45',
    'metrics.trendStarted': '開始 ',
    'metrics.trendSystemsNormal': 'すべてのシステムが正常です',
    'metrics.trendTarget': 'ターゲット: ',
    'metrics.frameRate': 'フレームレート',
    'metrics.fullHd': 'フル HD',

    // フッター
    'footer.description': 'ストリーム管理が簡単に',
    'footer.quickLinks': 'クイックリンク',
    'footer.about': 'について',
    'footer.help': 'ヘルプとサポート',
    'footer.status': 'システムステータス',
    'footer.legal': '法的',
    'footer.privacy': 'プライバシーポリシー',
    'footer.terms': '利用規約',
    'footer.contact': 'お問い合わせ',
    'footer.copyright': '© 2026 TauchoPortal. All rights reserved.',
  },

  de: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.streams': 'Stream-Verwaltung',
    'nav.settings': 'Einstellungen',
    'nav.logout': 'Abmelden',

    // Streams Seite
    'streams.title': 'Stream-Verwaltung',
    'streams.addStream': '+ Stream hinzufügen',
    'streams.backToDashboard': 'Zurück zum Dashboard',
    'streams.yourStreams': 'Ihre Streams',
    'streams.noStreamSelected': 'Kein Stream ausgewählt',
    'streams.selectStream': 'Wählen Sie einen Stream aus der Seitenleiste, um die Details anzuzeigen',

    // Stream Details
    'stream.viewers': 'Zuschauer',
    'stream.uptime': 'Betriebszeit',
    'stream.healthStatus': 'Gesundheitsstatus',
    'stream.bitrate': 'Bitrate',
    'stream.fps': 'FPS',
    'stream.resolution': 'Auflösung',
    'stream.pause': '⸸ Pause',
    'stream.stop': '⹜ Stopp',
    'stream.settings': '⚙️ Einstellungen',

    // Stream Info
    'stream.information': 'Stream-Informationen',
    'stream.rtmpUrl': 'RTMP URL:',
    'stream.streamKey': 'Stream-Schlüssel:',
    'stream.started': 'Gestartet:',
    'stream.recentIssues': 'Aktuelle Probleme',
    'stream.noIssuesDetected': 'Keine Probleme erkannt',
    'stream.viewerCount': 'Zuschauerzahl (letzte Stunde)',
    'stream.chartPlaceholder': '📊 Diagramm wird hier angezeigt',

    // Modal
    'modal.addNewStream': '➕ Neuen Stream hinzufügen',
    'modal.selectProvider': 'Anbieter auswählen',
    'modal.chooseProvider': 'Wählen Sie einen Anbieter...',
    'modal.streamName': 'Stream-Name',
    'modal.streamNamePlaceholder': 'z.B. Gaming Stream',
    'modal.rtmpUrl': 'RTMP URL',
    'modal.rtmpUrlPlaceholder': 'rtmp://...',
    'modal.streamKey': 'Stream-Schlüssel',
    'modal.streamKeyPlaceholder': 'Ihr Stream-Schlüssel',
    'modal.addStream': 'Stream hinzufügen',
    'modal.streamAdded': 'Stream hinzugefügt! (Backend-Integration erforderlich)',

    // Alerts
    'alert.copiedToClipboard': 'In die Zwischenablage kopiert!',
    'alert.pauseStream': 'Stream pausieren: ',
    'alert.stopStream': 'Stream stoppen: ',
    'alert.editStream': 'Stream bearbeiten: ',

    // Status
    'status.live': '🔴 LIVE',
    'status.offline': '⚪ OFFLINE',
    'status.ended': '⹼️ BEENDET',
    'status.excellent': '✅ Ausgezeichnet',
    'status.completed': 'Abgeschlossen',

    // Metrics
    'metrics.trendViewers': '+45 in den letzten 5 Minuten',
    'metrics.trendStarted': 'Gestartet vor ',
    'metrics.trendSystemsNormal': 'Alle Systeme normal',
    'metrics.trendTarget': 'Ziel: ',
    'metrics.frameRate': 'Bildrate',
    'metrics.fullHd': 'Full HD',
  },

  fr: {
    // Navigation
    'nav.dashboard': 'Tableau de bord',
    'nav.streams': 'Gestion des flux',
    'nav.settings': 'Paramètres',
    'nav.logout': 'Déconnexion',

    // Page Streams
    'streams.title': 'Gestion des flux',
    'streams.addStream': '+ Ajouter un flux',
    'streams.backToDashboard': 'Retour au tableau de bord',
    'streams.yourStreams': 'Vos flux',
    'streams.noStreamSelected': 'Aucun flux sélectionné',
    'streams.selectStream': 'Sélectionnez un flux dans la barre latérale pour afficher les détails',

    // Détails du flux
    'stream.viewers': 'Spectateurs',
    'stream.uptime': 'Temps de disponibilité',
    'stream.healthStatus': 'État de santé',
    'stream.bitrate': 'Débit binaire',
    'stream.fps': 'FPS',
    'stream.resolution': 'Résolution',
    'stream.pause': '⸸ Pause',
    'stream.stop': '⹜ Arrêt',
    'stream.settings': '⚙️ Paramètres',

    // Info du flux
    'stream.information': 'Informations sur le flux',
    'stream.rtmpUrl': 'URL RTMP:',
    'stream.streamKey': 'Clé de flux:',
    'stream.started': 'Commencé:',
    'stream.recentIssues': 'Problèmes récents',
    'stream.noIssuesDetected': 'Aucun problème détecté',
    'stream.viewerCount': 'Nombre de spectateurs (dernière heure)',
    'stream.chartPlaceholder': '📊 Le graphique s\'affichera ici',

    // Modal
    'modal.addNewStream': '➕ Ajouter un nouveau flux',
    'modal.selectProvider': 'Sélectionner le fournisseur',
    'modal.chooseProvider': 'Choisir un fournisseur...',
    'modal.streamName': 'Nom du flux',
    'modal.streamNamePlaceholder': 'ex: Flux de jeu',
    'modal.rtmpUrl': 'URL RTMP',
    'modal.rtmpUrlPlaceholder': 'rtmp://...',
    'modal.streamKey': 'Clé de flux',
    'modal.streamKeyPlaceholder': 'Votre clé de flux',
    'modal.addStream': 'Ajouter un flux',
    'modal.streamAdded': 'Flux ajouté! (Intégration backend requise)',

    // Alertes
    'alert.copiedToClipboard': 'Copié dans le presse-papiers!',
    'alert.pauseStream': 'Mettre en pause le flux: ',
    'alert.stopStream': 'Arrêter le flux: ',
    'alert.editStream': 'Modifier le flux: ',

    // Statut
    'status.live': '🔴 EN DIRECT',
    'status.offline': '⚪ HORS LIGNE',
    'status.ended': '⹼️ TERMINÉ',
    'status.excellent': '✅ Excellent',
    'status.completed': 'Complété',

    // Métriques
    'metrics.trendViewers': '+45 au cours des 5 dernières minutes',
    'metrics.trendStarted': 'Commencé il y a ',
    'metrics.trendSystemsNormal': 'Tous les systèmes sont normaux',
    'metrics.trendTarget': 'Cible: ',
    'metrics.frameRate': 'Fréquence d\'images',
    'metrics.fullHd': 'Haute définition',
  },

  es: {
    // Navegación
    'nav.dashboard': 'Panel de control',
    'nav.streams': 'Gestión de transmisiones',
    'nav.settings': 'Configuración',
    'nav.logout': 'Cerrar sesión',

    // Página de Streams
    'streams.title': 'Gestión de transmisiones',
    'streams.addStream': '+ Añadir transmisión',
    'streams.backToDashboard': 'Volver al panel de control',
    'streams.yourStreams': 'Tus transmisiones',
    'streams.noStreamSelected': 'Ninguna transmisión seleccionada',
    'streams.selectStream': 'Selecciona una transmisión en la barra lateral para ver los detalles',

    // Detalles de la transmisión
    'stream.viewers': 'Espectadores',
    'stream.uptime': 'Tiempo de actividad',
    'stream.healthStatus': 'Estado de salud',
    'stream.bitrate': 'Velocidad de bits',
    'stream.fps': 'FPS',
    'stream.resolution': 'Resolución',
    'stream.pause': '⸸ Pausa',
    'stream.stop': '⹜ Detener',
    'stream.settings': '⚙️ Configuración',

    // Info de la transmisión
    'stream.information': 'Información de la transmisión',
    'stream.rtmpUrl': 'URL RTMP:',
    'stream.streamKey': 'Clave de transmisión:',
    'stream.started': 'Iniciado:',
    'stream.recentIssues': 'Problemas recientes',
    'stream.noIssuesDetected': 'No se detectaron problemas',
    'stream.viewerCount': 'Cantidad de espectadores (última hora)',
    'stream.chartPlaceholder': '📊 El gráfico se mostrará aquí',

    // Modal
    'modal.addNewStream': '➕ Añadir nueva transmisión',
    'modal.selectProvider': 'Seleccionar proveedor',
    'modal.chooseProvider': 'Elige un proveedor...',
    'modal.streamName': 'Nombre de la transmisión',
    'modal.streamNamePlaceholder': 'p. ej., Transmisión de juegos',
    'modal.rtmpUrl': 'URL RTMP',
    'modal.rtmpUrlPlaceholder': 'rtmp://...',
    'modal.streamKey': 'Clave de transmisión',
    'modal.streamKeyPlaceholder': 'Tu clave de transmisión',
    'modal.addStream': 'Añadir transmisión',
    'modal.streamAdded': '¡Transmisión añadida! (Se requiere integración backend)',

    // Alertas
    'alert.copiedToClipboard': '¡Copiado al portapapeles!',
    'alert.pauseStream': 'Pausa transmisión: ',
    'alert.stopStream': 'Detener transmisión: ',
    'alert.editStream': 'Editar transmisión: ',

    // Estado
    'status.live': '🔴 EN DIRECTO',
    'status.offline': '⚪ FUERA DE LÍNEA',
    'status.ended': '⹼️ FINALIZADO',
    'status.excellent': '✅ Excelente',
    'status.completed': 'Completado',

    // Métricas
    'metrics.trendViewers': '+45 en los últimos 5 minutos',
    'metrics.trendStarted': 'Iniciado ',
    'metrics.trendSystemsNormal': 'Todos los sistemas normales',
    'metrics.trendTarget': 'Objetivo: ',
    'metrics.frameRate': 'Velocidad de fotogramas',
    'metrics.fullHd': 'Definición completa',
  },
};

/**
 * Get a translation string
 * @param {string} key - Translation key (e.g., 'streams.title')
 * @param {string} lang - Language code (e.g., 'en', 'ja')
 * @returns {string} Translated string or key if not found
 */
function t(key, lang = null) {
  if (!lang) {
    lang = getCurrentLanguage();
  }
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en']?.[key] || key;
}
