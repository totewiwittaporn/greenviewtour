// Google Maps Share > Embed, verified against the owner's saved pier link.
// Wide viewport preserves real geography between Khura Buri and Surin Islands.
export const verifiedPierMapUrl = 'https://maps.app.goo.gl/1ErL2zJHXys3hdPX6'
export const verifiedPierEmbed = 'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d504092.51033481676!2d98.06317321857014!3d9.2243647!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8396d375139ef9df%3A0x3861050714307405!2zR3JlZW52aWV3IFRvdXIg4LiX4LmI4Liy4LmA4Lij4Li34Lit4LmE4Lib4Lir4Lih4Li54LmI4LmA4LiB4Liy4Liw4Liq4Li44Lij4Li04LiZ4LiX4Lij4LmM!5e0!3m2!1sth!2sth!4v1789982095897!5m2!1sth!2sth'
export function locationMapEmbed(company, coordinates) {
  if (company?.mapUrl === verifiedPierMapUrl) return verifiedPierEmbed
  return coordinates ? `https://www.google.com/maps?q=${encodeURIComponent(coordinates)}&output=embed` : null
}

export const regionEmbed = 'https://www.google.com/maps/embed?pb=!1m10!1m8!1m3!1d251892.9785633716!2d98.08789245697236!3d9.436497484152381!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sth!2sth!4v1789982602648!5m2!1sth!2sth'
