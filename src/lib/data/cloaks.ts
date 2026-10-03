// s2 gives every Google product the same icon, so these link directly
const favicon = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

export type CloakPreset = { id: string; name: string; title: string; icon: string };

export const cloakPresets: CloakPreset[] = [
	{ id: 'classroom', name: 'Classroom', title: 'Home', icon: 'https://ssl.gstatic.com/classroom/favicon.png' },
	{ id: 'drive', name: 'Drive', title: 'My Drive - Google Drive', icon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png' },
	{ id: 'docs', name: 'Docs', title: 'Untitled document - Google Docs', icon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon-2023q4.ico' },
	{ id: 'gmail', name: 'Gmail', title: 'Inbox (3)', icon: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico' },
	{ id: 'google', name: 'Google', title: 'Google', icon: 'https://www.google.com/favicon.ico' },
	{ id: 'canvas', name: 'Canvas', title: 'Dashboard', icon: favicon('instructure.com') },
	{ id: 'clever', name: 'Clever', title: 'Clever | Portal', icon: favicon('clever.com') },
	{ id: 'schoology', name: 'Schoology', title: 'Home | Schoology', icon: favicon('schoology.com') },
	{ id: 'khan', name: 'Khan Academy', title: 'Dashboard | Khan Academy', icon: favicon('khanacademy.org') },
	{ id: 'quizlet', name: 'Quizlet', title: 'Your Library | Quizlet', icon: favicon('quizlet.com') },
	{ id: 'desmos', name: 'Desmos', title: 'Desmos | Graphing Calculator', icon: favicon('desmos.com') },
	{ id: 'wikipedia', name: 'Wikipedia', title: 'Wikipedia', icon: favicon('wikipedia.org') }
];
