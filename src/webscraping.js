const cibm_url = "https://cibm.ch/core-members/";

const coreMembers = async () => {
  const response = await fetch(cibm_url);
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const researchers = Array.from(doc.querySelectorAll(".team-member"));
  return researchers.map((researcher) => {
    const name = researcher.querySelector(".team-member-name").textContent;
    const institution = researcher.querySelector(
      ".team-member-institution"
    ).textContent;
    console.log(name, institution);
    return { name, institution };
  });
};
coreMembers();
