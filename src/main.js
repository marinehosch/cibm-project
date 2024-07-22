import L from "leaflet";
import { getInstitutions, getResearchersByInstitution } from "./getDB.js";
import * as d3 from "d3";

// Initialisation de la carte Leaflet
const map = L.map("map").setView([46.51999710099841, 6.569531292590334], 13);
L.tileLayer(
  "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
  {
    maxZoom: 20,
    attribution:
      '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank">OpenStreetMap</a>',
  }
).addTo(map);

L.svg().addTo(map);

// Définition de l'icône personnalisée
const blueIcon = (size) =>
  L.icon({
    iconUrl: "/src/icons/blue-circle.svg",
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1]],
  });

// Fonction pour calculer la taille de l'icône en fonction du nombre de chercheurs (semble ne pas fonctionner)
const calculateIconSize = (numResearchers) => {
  const minSize = 15;
  const maxSize = 70;
  const zoom = map.getZoom();

  if (zoom < 12) {
    return Math.min(maxSize, minSize + numResearchers * 1.5);
  } else if (zoom < 14) {
    return Math.min(maxSize, minSize + numResearchers * 1);
  } else if (zoom < 16) {
    return Math.min(maxSize, minSize + numResearchers * 0.5);
  } else if (zoom < 18) {
    return Math.min(maxSize, minSize + numResearchers * 0.25);
  } else {
    return Math.min(maxSize, minSize + numResearchers * 0.1);
  }
};

// Variables globales pour les données
let researchers = [];
let institutions = [];
let selectedResearchers = [];
let selectedInstitutions = [];

// Palette de couleurs personnalisée pour les modules
const moduleColors = d3
  .scaleOrdinal()
  .domain(["MRI", "EEG", "SP", "DS", "PET"])
  .range(["#304F5A", "#FBB522", "#ADD8E6", "#00008B", "#FFFFFF"]); // Couleurs pour MRI, EEG, SP, DS, PET

// Fonction pour initialiser les données
const initializeData = async () => {
  try {
    researchers = await getResearchersByInstitution();
    institutions = await getInstitutions();
    return { researchers, institutions };
  } catch (error) {
    console.error("Error initializing data:", error);
    return { researchers: [], institutions: [] };
  }
};

// Fonction pour mettre à jour les chercheurs sélectionnés en fonction des institutions et des modules
const updateSelectedResearchers = () => {
  const selectedModules = Array.from(
    document.querySelectorAll(".module-filter:checked")
  ).map((cb) => cb.value);

  if (selectedInstitutions.length === 0 && selectedModules.length === 0) {
    // Aucune institution sélectionnée et aucun filtre de module, ne rien afficher
    selectedResearchers = [];
  } else if (selectedInstitutions.length === 0) {
    // Aucun institution sélectionnée, afficher tous les chercheurs filtrés par module
    selectedResearchers = researchers.filter((researcher) =>
      selectedModules.includes(researcher.module)
    );
  } else if (selectedModules.length === 0) {
    // Aucun filtre de module sélectionné, afficher tous les chercheurs autour des institutions sélectionnées
    selectedResearchers = researchers.filter((researcher) =>
      selectedInstitutions.includes(researcher.institution)
    );
  } else {
    // Filtre de module sélectionné, afficher les chercheurs autour des institutions correspondantes
    selectedResearchers = researchers.filter(
      (researcher) =>
        selectedInstitutions.includes(researcher.institution) &&
        selectedModules.includes(researcher.module)
    );
  }

  // Mettre à jour l'affichage des chercheurs
  displaySelectedResearchers(selectedResearchers);
};

// Fonction pour afficher les chercheurs sélectionnés autour des institutions
const displaySelectedResearchers = (selectedResearchers) => {
  const overlay = d3.select(map.getPanes().overlayPane).select("svg");
  overlay.selectAll("*").remove();

  // Créer un tableau pour stocker les positions des chercheurs
  const researcherPositions = {};

  if (selectedInstitutions.length === 0) {
    institutions.forEach((institution) => {
      const institutionResearchers = selectedResearchers.filter(
        (researcher) => researcher.institution === institution.name
      );

      institutionResearchers.forEach((researcher, index) => {
        const center = map.latLngToLayerPoint([
          institution.latitude,
          institution.longitude,
        ]);
        const radius = 100;
        const angleStep = (2 * Math.PI) / institutionResearchers.length;

        const x = center.x + radius * Math.cos(index * angleStep);
        const y = center.y + radius * Math.sin(index * angleStep);

        // Ajouter les éléments (cercles, textes) pour chaque chercheur (stop texte pour le visuel)
        overlay
          .append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 7)
          .attr("fill", moduleColors(researcher.module))
          .attr("opacity", 0.7)
          .attr("stroke", "grey");

        researcherPositions[researcher.id] = { x, y };

        // Ajouter une ligne entre les chercheurs du même module
        institutionResearchers.forEach((target, targetIndex) => {
          if (index !== targetIndex) {
            const targetX =
              center.x + radius * Math.cos(targetIndex * angleStep);
            const targetY =
              center.y + radius * Math.sin(targetIndex * angleStep);

            overlay
              .append("line")
              .attr("x1", x)
              .attr("y1", y)
              .attr("x2", targetX)
              .attr("y2", targetY)
              .attr("stroke", moduleColors(researcher.module))
              .attr("stroke-opacity", 0.5);
          }
        });
      });
    });
  } else {
    selectedInstitutions.forEach((institutionName) => {
      const institution = institutions.find(
        (inst) => inst.name === institutionName
      );
      const institutionResearchers = selectedResearchers.filter(
        (researcher) => researcher.institution === institution.name
      );

      institutionResearchers.forEach((researcher, index) => {
        const center = map.latLngToLayerPoint([
          institution.latitude,
          institution.longitude,
        ]);
        const radius = 100;
        const angleStep = (2 * Math.PI) / institutionResearchers.length;

        const x = center.x + radius * Math.cos(index * angleStep);
        const y = center.y + radius * Math.sin(index * angleStep);

        // Ajouter les éléments (cercles, texte) pour chaque chercheur
        overlay
          .append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 7)
          .attr("fill", moduleColors(researcher.module))
          .attr("opacity", 0.7)
          .attr("stroke", "grey");

        researcherPositions[researcher.id] = { x, y };

        // Ajouter une ligne entre le chercheur et l'institution
        overlay
          .append("line")
          .attr("x1", x)
          .attr("y1", y)
          .attr("x2", center.x)
          .attr("y2", center.y)
          .attr("stroke", "grey");

        // Lier les chercheurs travaillant avec le même module
        const selectedModules = Array.from(
          document.querySelectorAll(".module-filter:checked")
        ).map((cb) => cb.value);

        const nodes = selectedResearchers.filter(
          (r) => r.institution === institution.name
        );

        const link = selectedModules.reduce((acc, module) => {
          const moduleResearchers = nodes.filter((r) => r.module === module);
          return acc.concat(
            moduleResearchers.map((r, i) => ({
              source: nodes.indexOf(r),
              target: nodes.indexOf(r) + i + 1,
            }))
          );
        }, []);

        // Ajouter les lignes entre les chercheurs du même module
        link.forEach((l) => {
          const source = researcherPositions[l.source];
          const target = researcherPositions[l.target];

          overlay
            .append("line")
            .attr("x1", source.x)
            .attr("y1", source.y)
            .attr("x2", target.x)
            .attr("y2", target.y)
            .attr("stroke", moduleColors(researcher.module))
            .attr("stroke-opacity", 0.5);
        });
      });
    });
  }
};

// Fonction pour mettre à jour la position des chercheurs et des lignes
const updatePositions = () => {
  displaySelectedResearchers(selectedResearchers);
};

map.on("zoomend", updatePositions);
map.on("moveend", updatePositions);

// Fonction pour effacer les chercheurs si clic sur la carte
const clearResearchers = () => {
  selectedInstitutions = [];
  updateSelectedResearchers();
};

// Gestion du clic en dehors des institutions pour effacer les chercheurs
map.on("click", clearResearchers);

// Fonction pour ajouter des marqueurs pour chaque institution sur la carte
const addInstitutionMarkers = () => {
  institutions.forEach((institution) => {
    if (!institution.latitude || !institution.longitude) return;

    // Calculer la taille de l'icône en fonction du nombre de chercheurs dans l'institution
    const numResearchers = researchers.filter(
      (r) => r.institution === institution.name
    ).length;
    const iconSize = calculateIconSize(numResearchers);

    const marker = L.marker([institution.latitude, institution.longitude], {
      icon: blueIcon([iconSize, iconSize]),
    })
      .addTo(map)
      .bindPopup(institution.name)
      .openPopup();

    // Afficher les institutions au hover
    marker.on("mouseover", () => {
      marker.openPopup();
    });

    marker.on("click", () => {
      // Mettre à jour la liste des institutions sélectionnées
      selectedInstitutions = [institution.name];
      updateSelectedResearchers();
    });
  });
};

// Fonction pour initialiser les filtres de module
const setupFilters = () => {
  document.querySelectorAll(".module-filter").forEach((checkbox) => {
    checkbox.checked = false;
    checkbox.addEventListener("change", () => {
      updateSelectedResearchers(); // Mettre à jour les chercheurs sélectionnés
    });
  });

  // Ecouteur de reset pour réinitialiser les filtres de module
  document.getElementById("reset-filters").addEventListener("click", () => {
    document.querySelectorAll(".module-filter").forEach((checkbox) => {
      checkbox.checked = false;
    });
    selectedInstitutions = []; // Réinitialiser les institutions sélectionnées
    updateSelectedResearchers(); // Réinitialiser les chercheurs sélectionnés
  });
};

// Appel de l'initialisation de la carte et des données
initializeData().then(() => {
  addInstitutionMarkers(); // Ajouter les marqueurs d'institution à la carte
  setupFilters(); // Initialiser les filtres des modules
});

// Fonction pour créer un graphique de réseau avec D3.js
// cosnt createNetworkChart = (data) => {

// const createNetworkChart = (data) => {
//   const width = 928;
//   const height = 600;

//   const color = d3.scaleOrdinal(d3.schemeCategory10);

//   const links = data.links.map((d) => ({ ...d }));
//   const nodes = data.nodes.map((d) => ({ ...d }));

//   const simulation = d3
//     .forceSimulation(nodes)
//     .force(
//       "link",
//       d3.forceLink(links).id((d) => d.id)
//     )
//     .force("charge", d3.forceManyBody())
//     .force("center", d3.forceCenter(width / 2, height / 2))
//     .on("tick", ticked);

//   const svg = d3
//     .create("svg")
//     .attr("width", width)
//     .attr("height", height)
//     .attr("viewBox", [0, 0, width, height])
//     .attr("style", "max-width: 100%; height: auto;");

//   const link = svg
//     .append("g")
//     .attr("stroke", "#999")
//     .attr("stroke-opacity", 0.6)
//     .selectAll("line")
//     .data(links)
//     .join("line")
//     .attr("stroke-width", (d) => Math.sqrt(d.value));

//   const node = svg
//     .append("g")
//     .attr("stroke", "#fff")
//     .attr("stroke-width", 1.5)
//     .selectAll("circle")
//     .data(nodes)
//     .join("circle")
//     .attr("r", 5)
//     .attr("fill", (d) => color(d.group))
//     .call(
//       d3
//         .drag()
//         .on("start", dragstarted)
//         .on("drag", dragged)
//         .on("end", dragended)
//     );

//   node.append("title").text((d) => d.id);

//   function ticked() {
//     link
//       .attr("x1", (d) => d.source.x)
//       .attr("y1", (d) => d.source.y)
//       .attr("x2", (d) => d.target.x)
//       .attr("y2", (d) => d.target.y);

//     node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
//   }

//   function dragstarted(event) {
//     if (!event.active) simulation.alphaTarget(0.3).restart();
//     event.subject.fx = event.subject.x;
//     event.subject.fy = event.subject.y;
//   }

//   function dragged(event) {
//     event.subject.fx = event.x;
//     event.subject.fy = event.y;
//   }

//   function dragended(event) {
//     if (!event.active) simulation.alphaTarget(0);
//     event.subject.fx = null;
//     event.subject.fy = null;
//   }

//   return svg.node();
// };

// // Fonction pour obtenir les données des chercheurs et institutions, et générer le graphique de réseau
// const initializeNetworkChart = async () => {
//   try {
//     const researchers = await getResearchersByInstitution();
//     const institutions = await getInstitutions();

//     // Créer des nœuds pour chaque chercheur
//     const nodes = researchers.map((r) => ({
//       id: r.name,
//       group: r.module,
//     }));

//     // Créer des liens entre les chercheurs qui partagent le même module
//     const links = [];
//     researchers.forEach((source, index) => {
//       researchers.forEach((target, targetIndex) => {
//         if (index !== targetIndex && source.module === target.module) {
//           links.push({
//             source: source.name,
//             target: target.name,
//             value: 1, // Vous pouvez ajuster la valeur en fonction de la force de la connexion
//           });
//         }
//       });
//     });

//     // Générer et afficher le graphique de réseau
//     const data = { nodes, links };
//     const chart = createNetworkChart(data);
//     document.getElementById("map").appendChild(chart);
//   } catch (error) {
//     console.error("Error initializing network chart:", error);
//   }
// };

// // Appel de l'initialisation du graphique de réseau
// initializeNetworkChart();
