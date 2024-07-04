import axios from "axios";
import cheerio from "cheerio";

const proxyUrl = "/api";

// Liste des institutions pour la correspondance
const institutionKeywords = [
  "CHUV-UNIL",
  "CHUV",
  "EPFL",
  "UNIGE",
  "HUG-UNIGE",
  "CIBM",
];

// Fonction pour récupérer les URL des membres de l'équipe via le sitemap
const getMemberUrls = async () => {
  const sitemap_url = `${proxyUrl}/team-sitemap.xml`;

  try {
    const response = await axios.get(sitemap_url);
    const sitemapData = response.data;
    const $sitemap = cheerio.load(sitemapData, { xmlMode: true });

    const memberUrls = [];
    $sitemap("url > loc").each((index, element) => {
      const url = $sitemap(element).text();
      memberUrls.push(url);
    });

    console.log("Fetched URLs:", memberUrls);
    return memberUrls;
  } catch (error) {
    console.error("Error fetching sitemap:", error);
    return [];
  }
};

// Fonction pour récupérer les détails des membres de l'équipe
const getMemberDetails = async (url) => {
  try {
    const response = await axios.get(proxyUrl + url, { timeout: 10000 }); // Utilisation du proxy
    const html = response.data;
    const $ = cheerio.load(html);

    const name = $("h2.tlp-member-title").text().trim();
    const positionText = $(".tlp-position").text().trim();
    const words = positionText.split(" ");

    const module =
      ["MRI", "EEG", "PET", "SP", "DS"].find((word) => words.includes(word)) ||
      "";
    let institutions = institutionKeywords.filter((inst) =>
      words.some((word) => word.includes(inst))
    );

    // Si une institution contient un tiret, on prend la première partie
    institutions = institutions.map((inst) =>
      inst.includes("-") ? inst.split("-")[0] : inst
    );

    const memberDetails = {
      name,
      module,
      institutions, // Liste des institutions trouvées
    };

    console.log(`Member details for ${url}:`, memberDetails); // Debug log
    return memberDetails;
  } catch (error) {
    console.error(`Error fetching member details for ${url}:`, error);
    return null;
  }
};

export { getMemberDetails };

export const getAllMembers = async () => {
  const memberUrls = await getMemberUrls();
  const members = [];

  for (const url of memberUrls) {
    console.log(`Processing URL: ${url}`); // Debug log
    const memberDetails = await getMemberDetails(url);
    if (memberDetails) {
      members.push(memberDetails);
    } else {
      console.log(`No details found for URL: ${url}`); // Debug log
    }
  }

  console.log("All Members Details:", members); // Debug log
  return members;
};

// Assurez-vous que la fonction getAllMembers n'est appelée qu'une seule fois
getAllMembers();
