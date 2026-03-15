/**
 * Centralized UI strings for astronoha.
 *
 * Single-language (Japanese) dictionary. All user-facing text lives here
 * so that:
 * - Text changes are made in one place
 * - Consistency is enforced mechanically
 * - Future i18n requires adding a locale key, not hunting through templates
 */

export const ui = {
	// ----------------------------------------------------------------
	// Navigation
	// ----------------------------------------------------------------
	nav: {
		search: "検索",
		timeline: "タイムライン",
		settings: "設定",
		about: "このアプリについて",
		skipToContent: "メインコンテンツへ",
		top: "トップ",
		backToTop: "トップページに戻る",
		backToResults: "検索結果に戻る",
		breadcrumb: "パンくずリスト",
	},

	// ----------------------------------------------------------------
	// Search
	// ----------------------------------------------------------------
	search: {
		placeholder: "検索キーワードを入力",
		placeholderChange: "キーワードを変更",
		button: "検索",
		reSearch: "再検索",
		show: "表示",
		targetLabel: "検索対象",
		targetBoth: "両方",
		targetKokkai: "国会",
		targetTeikoku: "帝国議会",
		examplesLabel: "例:",
		resultsTitle: (keyword: string) => `「${keyword}」の検索結果`,
		resultsCount: (count: number) => `${count.toLocaleString()}件の発言`,
		countKokkai: (count: number) => `国会: ${count.toLocaleString()}件`,
		countTeikoku: (count: number) => `帝国議会: ${count.toLocaleString()}件`,
		speechList: "発言一覧",
		relatedBooks: "関連書籍",
		noResults: (keyword: string) =>
			`「${keyword}」に一致する発言は見つかりませんでした。`,
		noResultsHint: "別のキーワードや、検索対象の変更をお試しください。",
		speechDetail: "発言詳細",
		viewOnNdl: "国会会議録検索システムで見る",
		viewMeeting: "会議全体を見る",
	},

	// ----------------------------------------------------------------
	// Speaker
	// ----------------------------------------------------------------
	speaker: {
		speechCount: "件の発言",
		kokkai: "国会",
		teikoku: "帝国議会",
		noResults: (name: string) => `「${name}」の発言は見つかりませんでした。`,
	},

	// ----------------------------------------------------------------
	// Timeline
	// ----------------------------------------------------------------
	timeline: {
		title: "タイムライン",
		timelineOf: (period: string) => `${period}のタイムライン`,
		keyword: (keyword: string) => `キーワード: 「${keyword}」`,
		promptKeyword:
			"キーワードを入力して、この期間の議会発言と出版物を検索してください。",
		speechCount: "件の発言",
		publicationCount: "件の出版物",
		noResults: (keyword: string) =>
			`この期間に「${keyword}」に関連する議事録・出版物は見つかりませんでした。`,
		filterAll: (count: number) => `すべて (${count})`,
		filterSpeeches: (count: number) => `議事録 (${count})`,
		filterPublications: (count: number) => `出版物 (${count})`,
		typeSpeech: "議事録",
		typePublication: "出版物",
		displayCount: (shown: number, total: number) =>
			`${shown}件を表示中（全${total}件）`,
		noData: "この期間のデータがありません",
		unknownDate: "日付不明",
		viewOnNdlSearch: "NDLサーチで見る",
		description:
			"議会の議事録とNDLサーチの出版物を日付軸で重ね合わせ、ある言葉が議会で議論された時期にどんな書籍が出版されたかを閲覧できます。",
		selectPeriod: "期間を選ぶか、年月を直接指定してください。",
		customPeriod: "年月を指定",
		customPeriodHint:
			"1890-01〜現在の年月をYYYY-MM形式で入力してください（例: 1947-05）",
		customPeriodInvalid: (value: string) =>
			`「${value}」は有効な年月ではありません。YYYY-MM形式（例: 1947-05）で、1890-01以降の年月を入力してください。`,
		go: "表示",
	},

	// ----------------------------------------------------------------
	// Settings
	// ----------------------------------------------------------------
	settings: {
		title: "設定",
		description: "カラーモードやブラウザAIアシスタントの設定を変更します。",
		colorMode: "カラーモード",
		colorModeDescription:
			"ライトモード、ダークモード、またはシステム設定に従うかを選択します。",
		colorModeSystem: "システム設定に従う",
		colorModeLight: "ライトモード",
		colorModeDark: "ダークモード",
		colorModeSystemShort: "システム",
		colorModeLightShort: "ライト",
		colorModeDarkShort: "ダーク",
		autoSummary: "ブラウザAIアシスタント",
		autoSummaryDescription:
			"Chrome built-in AI対応ブラウザで、発言の要約・時代背景・傾向分析などのAI機能を有効にします。",
		autoSummaryDetail: "各ページでAIアシスタント機能を利用する",
		chromeAiRequired: "Chrome（デスクトップ版）のブラウザAI機能を使用します",
		saveButton: "設定を保存",
		saving: "保存中...",
		saveFailed: "設定の保存に失敗しました。もう一度お試しください。",
	},

	// ----------------------------------------------------------------
	// Error / Warning
	// ----------------------------------------------------------------
	error: {
		label: "エラー",
		islandLoadFailed: "このセクションの読み込みに失敗しました。",
		notFoundTitle: "ページが見つかりません",
		notFoundDescription:
			"指定されたURLのページは存在しないか、移動した可能性があります。URLをご確認のうえ、もう一度お試しください。",
		serverErrorTitle: "サーバーエラーが発生しました",
		serverErrorDescription:
			"申し訳ありません。サーバーで予期しないエラーが発生しました。しばらく時間をおいてから、もう一度お試しください。",
		unknownError: "不明なエラーが発生しました",
		kokkaiSearchFailed: (detail: string) =>
			`国会会議録の検索に失敗しました: ${detail}`,
		teikokuSearchFailed: (detail: string) =>
			`帝国議会会議録の検索に失敗しました: ${detail}`,
		kokkaiRetrieveFailed: (detail: string) =>
			`国会会議録の取得に失敗しました: ${detail}`,
		teikokuRetrieveFailed: (detail: string) =>
			`帝国議会会議録の取得に失敗しました: ${detail}`,
		publicationRetrieveFailed: (detail: string) =>
			`出版物の取得に失敗しました: ${detail}`,
		speechRetrieveFailed: (detail: string) =>
			`発言の取得に失敗しました: ${detail}`,
		speechNotFound: "指定された発言が見つかりませんでした。",
		timelineFetchFailed: "タイムラインデータの取得中にエラーが発生しました",
		invalidPeriod: "無効な期間形式です",
		speakerFetchFailed: "発言者情報の取得中にエラーが発生しました",
		unknownDetail: "不明なエラー",
	},

	// ----------------------------------------------------------------
	// LLM
	// ----------------------------------------------------------------
	llm: {
		title: "ブラウザAIアシスタント",
		checking: "AI機能の利用可否を確認中...",
		unavailable:
			"この機能はChrome（デスクトップ版）のブラウザAI機能を使用します。",
		howToEnable: "有効にする方法",
		enableStep1Prefix: "アドレスバーに",
		enableStep1Flag: "chrome://flags/#prompt-api-for-gemini-nano",
		enableStep1Action: "と入力し「Enabled」に設定",
		enableStep2: "Chromeを再起動",
		enableStep3: "AIモデルのダウンロードが自動的に開始されます",
		downloading: "AIモデルをダウンロード中です。しばらくお待ちください...",
		downloadStarting: "AIモデルのダウンロードを開始しています...",
		downloadTimeout:
			"モデルのダウンロードがタイムアウトしました。ページを再読み込みしてください。",
		initFailed:
			"AI機能の初期化に失敗しました。ページを再読み込みしてください。",
		generateError: "生成中にエラーが発生しました",
		summarize: "要約する",
		summarizing: "要約中...",
		suggestKeywords: "関連キーワードを提案",
		suggesting: "提案中...",
		historicalContext: "時代背景",
		generating: "生成中...",
		promptSummarize:
			"以下の国会/帝国議会の発言を、現代の日本語で3文以内に要約してください",
		promptSuggestKeywords: (keyword: string) =>
			`${keyword}について、議会で使われていた可能性のある別の表現を3つ提案してください`,
		promptHistoricalContext: (year: string) =>
			`${year}年頃の日本の政治的・社会的背景を2文で説明してください`,
		analyzeTrend: "傾向を分析",
		analyzing: "分析中...",
		promptAnalyzeTrend: (keyword: string) =>
			`「${keyword}」という言葉の議会での使用頻度の変遷について、日本の政治・社会的背景を踏まえて分析してください`,
		disclaimer:
			"AIの回答には誤りが含まれる可能性があります。正確な情報は原文や公式資料をご確認ください。",
	},

	// ----------------------------------------------------------------
	// Accessibility
	// ----------------------------------------------------------------
	a11y: {
		searchKeyword: "検索キーワード",
		pageNavigation: "ページナビゲーション",
		prevPage: "前のページ",
		prev: "前へ",
		nextPage: "次のページ",
		next: "次へ",
		bookCover: (title: string) => `${title}の書影`,
	},

	// ----------------------------------------------------------------
	// Components
	// ----------------------------------------------------------------
	heatmap: {
		title: "年代別出現頻度",
		noData: "データがありません",
		dbUnavailable: "ヒートマップデータベースが利用できません。",
		generating: (populated: number, total: number, percent: number) =>
			`データを生成中 — ${populated} / ${total} 年完了（${percent}%）`,
		generatingDescription:
			"国立国会図書館APIへの負荷を抑えるため、年ごとに順次取得しています。初回のみ時間がかかりますが、一度生成されたデータは保存され、次回以降は即座に表示されます。",
		generatingHint:
			"このページは自動的に更新されます。しばらくお待ちください。",
	},
	bookCarousel: {
		title: "関連書籍",
		noData: "関連する書籍が見つかりませんでした",
		loading: "関連書籍を検索中…",
	},
	keywordCloud: {
		title: (name: string) => `${name}の頻出キーワード`,
		noData: "キーワードデータがありません",
	},

	// ----------------------------------------------------------------
	// Attribution
	// ----------------------------------------------------------------
	attribution: {
		source: "出典：",
		ndl: "国立国会図書館",
		kokkaiApi: "国会会議録検索システム API",
		teikokuApi: "帝国議会会議録検索システム API",
		ndlSearchApi: "NDLサーチ API",
	},
} as const;
