/** Unsplash source helper. Replace with the client's own photography/CDN before launch. */
export const img = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`

export const IMAGES = {
  heroWarehouse: img('1553413077-190dd305871c', 2400),
  heroTower: img('1511818966892-d7d671e672a2', 2400),
  heroSolar: img('1613665813446-82a78c468a1d', 2400),
  architecture: img('1460574283810-2aab119d8511', 2000),
  architectureCurve: img('1518005020951-eccb494ad742', 2000),
  towers: img('1486406146926-c627a92ad1ab', 2000),
  glassTower: img('1487958449943-2429e8be8625', 2000),
  logistics: img('1494412574643-ff11b0a5c1c3', 2200),
  parcels: img('1586528116311-ad8dd3c8310d', 2000),
  handoff: img('1566576721346-d4a3b4eaeb55', 2000),
  office: img('1497215728101-856f4ea42174', 2000),
  forest: img('1511497584788-876760111969', 2400),
  lake: img('1470770841072-f978cf4d019e', 2400),
  darkStructure: img('1590069261209-f8e9b8642343', 2400),
  darkTexture: img('1550684376-efcbd6e3f031', 2000),
  storm: img('1478760329108-5c3ed9d495a0', 2400),
  plan: img('1503387762-592deb58ef4e', 2000),
}
