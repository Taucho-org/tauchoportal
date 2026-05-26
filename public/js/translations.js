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

    // Stream Triggers
    'triggers.title': 'Stream Triggers',
    'triggers.subtitle': 'Set up automated actions that trigger when your streams go live',
    'triggers.addTrigger': '+ Create Trigger',
    'triggers.yourAccounts': 'Your Accounts',
    'triggers.selectAccount': 'Select an Account',
    'triggers.selectAccountToView': 'Choose an account from the sidebar to view and manage its triggers',
    'triggers.noTriggersForAccount': 'No triggers set up for this account yet',
    'triggers.addForAccount': '+ Add Trigger',
    'triggers.createNewTrigger': 'Create New Trigger',
    'triggers.triggerSaved': 'Trigger saved successfully!',

    // Trigger Details
    'trigger.name': 'Trigger Name',
    'trigger.account': 'Account',
    'trigger.enabled': 'Status',
    'trigger.enabledLabel': 'Enabled',
    'trigger.actions': 'Actions',
    'trigger.actionsHelp': 'Add one or more actions that will execute when the stream starts',
    'trigger.addAction': '+ Add Action',
    'trigger.edit': '✏️ Edit',
    'trigger.delete': '🗑 Delete',
    'trigger.createdOn': 'Created on',
    'trigger.lastTriggered': 'Last triggered',

    // Buttons
    'button.cancel': 'Cancel',
    'button.save': 'Save Trigger',
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

    // ストリームトリガー
    'triggers.title': 'ストリームトリガー',
    'triggers.subtitle': 'ストリームがライブになったときにトリガーされる自動化されたアクションを設定します',
    'triggers.addTrigger': '+ トリガーを作成',
    'triggers.yourAccounts': 'あなたのアカウント',
    'triggers.selectAccount': 'アカウントを選択',
    'triggers.selectAccountToView': 'サイドバーからアカウントを選択して、そのトリガーを表示および管理します',
    'triggers.noTriggersForAccount': 'このアカウントにはまだトリガーが設定されていません',
    'triggers.addForAccount': '+ トリガーを追加',
    'triggers.createNewTrigger': '新しいトリガーを作成',
    'triggers.triggerSaved': 'トリガーが正常に保存されました!',

    // トリガーの詳細
    'trigger.name': 'トリガー名',
    'trigger.account': 'アカウント',
    'trigger.enabled': 'ステータス',
    'trigger.enabledLabel': '有効',
    'trigger.actions': 'アクション',
    'trigger.actionsHelp': 'ストリームが開始されたときに実行される1つ以上のアクションを追加します',
    'trigger.addAction': '+ アクションを追加',
    'trigger.edit': '✏️ 編集',
    'trigger.delete': '🗑 削除',
    'trigger.createdOn': '作成日時',
    'trigger.lastTriggered': '最後にトリガーされた',

    // ボタン
    'button.cancel': 'キャンセル',
    'button.save': 'トリガーを保存',
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

    // Fußzeile
    'footer.description': 'Stream-Verwaltung leicht gemacht',
    'footer.quickLinks': 'Quick Links',
    'footer.about': 'Über uns',
    'footer.help': 'Hilfe & Support',
    'footer.status': 'Systemstatus',
    'footer.legal': 'Rechtlich',
    'footer.privacy': 'Datenschutzrichtlinie',
    'footer.terms': 'Nutzungsbedingungen',
    'footer.contact': 'Kontakt',
    'footer.copyright': '© 2026 TauchoPortal. Alle Rechte vorbehalten.',

    // Stream-Auslöser
    'triggers.title': 'Stream-Auslöser',
    'triggers.subtitle': 'Richten Sie automatisierte Aktionen ein, die ausgelöst werden, wenn Ihre Streams live gehen',
    'triggers.addTrigger': '+ Auslöser erstellen',
    'triggers.yourAccounts': 'Ihre Konten',
    'triggers.selectAccount': 'Konto auswählen',
    'triggers.selectAccountToView': 'Wählen Sie ein Konto aus der Seitenleiste aus, um seine Auslöser anzuzeigen und zu verwalten',
    'triggers.noTriggersForAccount': 'Für dieses Konto sind noch keine Auslöser eingerichtet',
    'triggers.addForAccount': '+ Auslöser hinzufügen',
    'triggers.createNewTrigger': 'Neuen Auslöser erstellen',
    'triggers.triggerSaved': 'Auslöser erfolgreich gespeichert!',

    // Auslöser-Details
    'trigger.name': 'Triggername',
    'trigger.account': 'Konto',
    'trigger.enabled': 'Status',
    'trigger.enabledLabel': 'Aktiviert',
    'trigger.actions': 'Aktionen',
    'trigger.actionsHelp': 'Fügen Sie eine oder mehrere Aktionen hinzu, die ausgeführt werden, wenn der Stream startet',
    'trigger.addAction': '+ Aktion hinzufügen',
    'trigger.edit': '✏️ Bearbeiten',
    'trigger.delete': '🗑 Löschen',
    'trigger.createdOn': 'Erstellt am',
    'trigger.lastTriggered': 'Zuletzt ausgelöst',

    // Schaltflächen
    'button.cancel': 'Abbrechen',
    'button.save': 'Auslöser speichern',
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

    // Pied de page
    'footer.description': 'Gestion de flux facilitée',
    'footer.quickLinks': 'Liens rapides',
    'footer.about': 'À propos',
    'footer.help': 'Aide et support',
    'footer.status': 'État du système',
    'footer.legal': 'Légal',
    'footer.privacy': 'Politique de confidentialité',
    'footer.terms': 'Conditions d\'utilisation',
    'footer.contact': 'Contact',
    'footer.copyright': '© 2026 TauchoPortal. Tous droits réservés.',

    // Déclencheurs de flux
    'triggers.title': 'Déclencheurs de flux',
    'triggers.subtitle': 'Configurez des actions automatisées qui se déclenchent quand vos flux deviennent actifs',
    'triggers.addTrigger': '+ Créer un déclencheur',
    'triggers.yourAccounts': 'Vos comptes',
    'triggers.selectAccount': 'Sélectionner un compte',
    'triggers.selectAccountToView': 'Choisissez un compte dans la barre latérale pour afficher et gérer ses déclencheurs',
    'triggers.noTriggersForAccount': 'Aucun déclencheur configuré pour ce compte',
    'triggers.addForAccount': '+ Ajouter un déclencheur',
    'triggers.createNewTrigger': 'Créer un nouveau déclencheur',
    'triggers.triggerSaved': 'Déclencheur enregistré avec succès!',

    // Détails du déclencheur
    'trigger.name': 'Nom du déclencheur',
    'trigger.account': 'Compte',
    'trigger.enabled': 'Statut',
    'trigger.enabledLabel': 'Activé',
    'trigger.actions': 'Actions',
    'trigger.actionsHelp': 'Ajoutez une ou plusieurs actions qui s\'exécuteront au démarrage du flux',
    'trigger.addAction': '+ Ajouter une action',
    'trigger.edit': '✏️ Modifier',
    'trigger.delete': '🗑 Supprimer',
    'trigger.createdOn': 'Créé le',
    'trigger.lastTriggered': 'Déclenché en dernier',

    // Boutons
    'button.cancel': 'Annuler',
    'button.save': 'Enregistrer le déclencheur',
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

    // Pie de página
    'footer.description': 'Gestión de transmisiones hecha fácil',
    'footer.quickLinks': 'Enlaces rápidos',
    'footer.about': 'Acerca de',
    'footer.help': 'Ayuda y soporte',
    'footer.status': 'Estado del sistema',
    'footer.legal': 'Legal',
    'footer.privacy': 'Política de privacidad',
    'footer.terms': 'Términos de servicio',
    'footer.contact': 'Contacto',
    'footer.copyright': '© 2026 TauchoPortal. Todos los derechos reservados.',

    // Disparadores de transmisión
    'triggers.title': 'Disparadores de transmisión',
    'triggers.subtitle': 'Configure acciones automatizadas que se activen cuando sus transmisiones estén en directo',
    'triggers.addTrigger': '+ Crear disparador',
    'triggers.yourAccounts': 'Sus cuentas',
    'triggers.selectAccount': 'Seleccionar cuenta',
    'triggers.selectAccountToView': 'Elija una cuenta en la barra lateral para ver y gestionar sus disparadores',
    'triggers.noTriggersForAccount': 'No hay disparadores configurados para esta cuenta',
    'triggers.addForAccount': '+ Añadir disparador',
    'triggers.createNewTrigger': 'Crear nuevo disparador',
    'triggers.triggerSaved': '¡Disparador guardado con éxito!',

    // Detalles del disparador
    'trigger.name': 'Nombre del disparador',
    'trigger.account': 'Cuenta',
    'trigger.enabled': 'Estado',
    'trigger.enabledLabel': 'Activado',
    'trigger.actions': 'Acciones',
    'trigger.actionsHelp': 'Agregue una o más acciones que se ejecutarán cuando comience la transmisión',
    'trigger.addAction': '+ Añadir acción',
    'trigger.edit': '✏️ Editar',
    'trigger.delete': '🗑 Eliminar',
    'trigger.createdOn': 'Creado el',
    'trigger.lastTriggered': 'Último disparo',

    // Botones
    'button.cancel': 'Cancelar',
    'button.save': 'Guardar disparador',
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
