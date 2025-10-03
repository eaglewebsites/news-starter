// lib/sites.js
export const SITES = {
  sandhills: {
    // All domains that should be treated as “Sandhills Post”
    domains: [
      "sandhillspost.com",
      "www.sandhillspost.com",
      "sandhillspost.net",
      "www.sandhillspost.net",
 
      // add any alternates you serve the same site on
    ],
    logo: "/logos/sand-hills-post-logo.png",
    stations: [
      {
        name: "KNPQ",
        href: "https://knpqcountry.com/",
        logo: "https://public-post-items.s3.amazonaws.com/northplatte/q-country-logo.jpeg", // 👈 put the file in /public/logos/
        alt: "Q Country",
      },
      {
        name: "KELN",
        href: "https://mix97one.com/",
        logo: "https://public-post-items.s3.amazonaws.com/northplatte/mix-97-one-logo.jpeg",
        alt: "Mix 97",
      },
      {
        name: "KOOQ",
        href: "https://kooqfm981.com/",
        logo: "https://public-post-items.s3.amazonaws.com/northplatte/98-1-logo.png",
        alt: "KOOQFM 98.1",
      },
      {
        name: "KZTL",
        href: "https://z935country.com/",
        logo: "https://public-post-items.s3.amazonaws.com/northplatte/z-93-5-logo.png",
        alt: "Z935 Country",
      },
      {
        name: "KRNP",
        href: "https://flatrock1007.com/",
        logo: "https://public-post-items.s3.amazonaws.com/northplatte/flat-rock-logo.png",
        alt: "Flat Rock 100.7",
      },
    ],
  },

  // You can add other sites here later (greatbendpost, hayspost, etc.)
  greatbend: {
    // All domains that should be treated as “Sandhills Post”
    domains: [
      "greatbendpost.com",
      "www.greatbendpost.com",
 
      // add any alternates you serve the same site on
    ],
    logo: "/logos/great-bend-post-logo.png",
    stations: [
      {
        name: "KVGB",
        href: "https://kvgbam.com",
        logo: "https://public-post-items.s3.amazonaws.com/greatbend/kvgb-logo.png", // 👈 put the file in /public/logos/
        alt: "KVGB",
      },
      {
        name: "100.7 Eagle Country",
        href: "https://khokfm.com",
        logo: "https://public-post-items.s3.amazonaws.com/greatbend/100-7-eagle-country-logo.png",
        alt: "100.7 Eagle Country",
      },
      {
        name: "B104.3 The Point",
        href: "https://b1043.net",
        logo: "https://public-post-items.s3.amazonaws.com/greatbend/b-104-logo.png",
        alt: "B104.3 The Point",
      },
      {
        name: "KZTL",
        href: "https://z935country.com/",
        logo: "https://public-post-items.s3.amazonaws.com/northplatte/z-93-5-logo.png",
        alt: "Z935 Country",
      },
      {
        name: "Hits 106.9",
        href: "https://hits1069.com",
        logo: "https://public-post-items.s3.amazonaws.com/greatbend/hits-106-9-logo.png",
        alt: "Hits 106.9",
      },
    ],
  },
};
