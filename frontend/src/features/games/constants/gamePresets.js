/**
 * Danh mục Preset Game Cyber chuẩn hóa
 * Giúp kỹ thuật viên tự động điền (Auto-detect & 1-Click Fill) thông tin game,
 * ảnh bìa HD, đường dẫn file .exe mặc định trên ổ BootROM SAN và tham số khởi chạy Esports.
 */
export const CYBER_GAME_PRESETS = [
  {
    id: 'cs2',
    name: 'Counter-Strike 2',
    steamAppId: '730',
    category_id: 1,
    category_name: 'Esports - Bắn Súng (FPS)',
    cover_image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
    executable_path: 'D:\\Games\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\game\\bin\\win64\\cs2.exe',
    is_remote_supported: true
  },
  {
    id: 'valorant',
    name: 'Valorant',
    steamAppId: '',
    category_id: 1,
    category_name: 'Esports - Bắn Súng (FPS)',
    cover_image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    executable_path: 'D:\\Games\\Riot Games\\VALORANT\\live\\VALORANT.exe',
    is_remote_supported: true
  },
  {
    id: 'lol',
    name: 'League of Legends',
    steamAppId: '',
    category_id: 2,
    category_name: 'Esports - MOBA',
    cover_image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
    executable_path: 'D:\\Games\\Riot Games\\League of Legends\\LeagueClient.exe',
    is_remote_supported: true
  },
  {
    id: 'dota2',
    name: 'Dota 2',
    steamAppId: '570',
    category_id: 2,
    category_name: 'Esports - MOBA',
    cover_image_url: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=600&auto=format&fit=crop&q=80',
    executable_path: 'D:\\Games\\Steam\\steamapps\\common\\dota 2 beta\\game\\bin\\win64\\dota2.exe',
    is_remote_supported: true
  },
  {
    id: 'fco4',
    name: 'FC Online 4',
    steamAppId: '',
    category_id: 2,
    category_name: 'Esports - MOBA',
    cover_image_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
    executable_path: 'D:\\Games\\Garena\\FCO\\FCO.exe',
    is_remote_supported: false
  },
  {
    id: 'pubg',
    name: 'PUBG: BATTLEGROUNDS',
    steamAppId: '578080',
    category_id: 1,
    category_name: 'Esports - Bắn Súng (FPS)',
    cover_image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    executable_path: 'D:\\Games\\Steam\\steamapps\\common\\PUBG\\TslGame\\Binaries\\Win64\\TslGame.exe',
    is_remote_supported: false
  },
  {
    id: 'apex',
    name: 'Apex Legends',
    steamAppId: '1172470',
    category_id: 1,
    category_name: 'Esports - Bắn Súng (FPS)',
    cover_image_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    executable_path: 'D:\\Games\\Steam\\steamapps\\common\\Apex Legends\\r5apex.exe',
    is_remote_supported: true
  },
  {
    id: 'wukong',
    name: 'Black Myth: Wukong',
    steamAppId: '2358720',
    category_id: 3,
    category_name: 'AAA Trải Nghiệm & Nhập Vai',
    cover_image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    executable_path: 'D:\\Games\\Steam\\steamapps\\common\\BlackMythWukong\\b1\\Binaries\\Win64\\b1-Win64-Shipping.exe',
    is_remote_supported: true
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk 2077 RT',
    steamAppId: '1091500',
    category_id: 3,
    category_name: 'AAA Trải Nghiệm & Nhập Vai',
    cover_image_url: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&auto=format&fit=crop&q=80',
    executable_path: 'D:\\Games\\Steam\\steamapps\\common\\Cyberpunk 2077\\bin\\x64\\Cyberpunk2077.exe',
    is_remote_supported: true
  },
  {
    id: 'gtav',
    name: 'Grand Theft Auto V',
    steamAppId: '271590',
    category_id: 3,
    category_name: 'AAA Trải Nghiệm & Nhập Vai',
    cover_image_url: 'https://images.unsplash.com/photo-1552824722-ddab1374e622?w=600&auto=format&fit=crop&q=80',
    executable_path: 'D:\\Games\\Rockstar Games\\Grand Theft Auto V\\GTA5.exe',
    is_remote_supported: true
  },
  {
    id: 'eldenring',
    name: 'Elden Ring',
    steamAppId: '1245620',
    category_id: 3,
    category_name: 'AAA Trải Nghiệm & Nhập Vai',
    cover_image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    executable_path: 'D:\\Games\\Steam\\steamapps\\common\\ELDEN RING\\Game\\eldenring.exe',
    is_remote_supported: true
  },
  {
    id: 'naraka',
    name: 'Naraka: Bladepoint',
    steamAppId: '1203220',
    category_id: 3,
    category_name: 'AAA Trải Nghiệm & Nhập Vai',
    cover_image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    executable_path: 'D:\\Games\\Steam\\steamapps\\common\\NARAKA BLADEPOINT\\NarakaBladepoint.exe',
    is_remote_supported: true
  },
  {
    id: 'genshin',
    name: 'Genshin Impact',
    steamAppId: '',
    category_id: 3,
    category_name: 'AAA Trải Nghiệm & Nhập Vai',
    cover_image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    executable_path: 'D:\\Games\\Genshin Impact\\GenshinImpact.exe',
    is_remote_supported: true
  },
  {
    id: 'overwatch2',
    name: 'Overwatch 2',
    steamAppId: '2357570',
    category_id: 1,
    category_name: 'Esports - Bắn Súng (FPS)',
    cover_image_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    executable_path: 'D:\\Games\\Steam\\steamapps\\common\\Overwatch\\Overwatch.exe',
    is_remote_supported: true
  }
];



/**
 * Trích xuất Steam AppID từ URL Steam Store hoặc chuỗi số thuần túy
 * Hỗ trợ các định dạng:
 * - https://store.steampowered.com/app/2358720/Black_Myth_Wukong/
 * - store.steampowered.com/app/730
 * - 2358720
 */
export function extractSteamAppId(input) {
  if (!input) return null;
  const clean = String(input).trim();
  const urlMatch = clean.match(/\/app\/(\d+)/i);
  if (urlMatch && urlMatch[1]) return urlMatch[1];
  if (/^\d+$/.test(clean)) return clean;
  return null;
}

/**
 * Tra cứu Preset thông minh dựa theo URL Steam Store, Steam AppID hoặc tên game
 */
export function findPresetByQuery(query) {
  if (!query) return null;
  const cleanQuery = String(query).trim().toLowerCase();

  // 1. Trích xuất AppID nếu dán link URL Steam Store
  const appIdFromUrl = extractSteamAppId(cleanQuery);

  return CYBER_GAME_PRESETS.find((preset) => {
    const presetId = String(preset.steamAppId || '').toLowerCase();
    const presetName = preset.name.toLowerCase();
    const presetKey = String(preset.id || '').toLowerCase();

    // Khớp theo ID trích xuất từ URL, khớp theo ID gõ tay, hoặc khớp theo tên game
    return (
      (appIdFromUrl && presetId === appIdFromUrl) ||
      (presetId && presetId === cleanQuery) ||
      presetKey === cleanQuery ||
      presetName.includes(cleanQuery) ||
      cleanQuery.includes(presetName)
    );
  }) || null;
}
