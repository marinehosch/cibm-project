import axios from "axios";
import cheerio from "cheerio";

export const coreMembers = async () => {
  const cibm_url = "/api/core-members/"; // Utilisation du proxy pour contourner CORS

  try {
    const response = await axios.get(cibm_url);
    const html = response.data;
    const $ = cheerio.load(html);

    const members = [];
    $("div.rt-col-md-2").each((index, element) => {
      const name = $(element).find(".team-name").text().trim();
      const positionElement = $(element).find(".tlp-position");

      const positionText = positionElement.text().trim();
      const words = positionText.split(" ");

      const module = ["MRI", "EEG", "PET", "SP", "DS"].filter((word) =>
        words.includes(word)
      );

      const institution = ["CHUV", "UNIL", "EPFL", "HUG", "UNIGE", "CIBM"].find(
        (inst) => words.some((word) => word.includes(inst))
      );

      const detailsMember = {
        name,
        module: module || "",
        institution: institution || "",
      };

      members.push(detailsMember);
    });

    console.log(members);
    return members;
  } catch (error) {
    console.error("Error scraping core members:", error);
  }
};

// coreMembers();
