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

// Fonction pour calculer la taille de l'icône en fonction du nombre de chercheurs
const calculateIconSize = (numResearchers) => {
  const minSize = 20;
  const maxSize = 60;
  const size = Math.min(maxSize, minSize + numResearchers * 2);
  return [size, size];
};

// Fonction pour initialiser les données
const initializeData = async () => {
  try {
    const researchers = await getResearchersByInstitution();
    const institutions = await getInstitutions();

    const institutionNames = institutions.map((inst) => inst.name);
    const modules = [...new Set(researchers.map((r) => r.module))];

    return { researchers, institutions, institutionNames, modules };
  } catch (error) {
    console.error("Error initializing data:", error);
    return {
      researchers: [],
      institutions: [],
      institutionNames: [],
      modules: [],
    };
  }
};

initializeData().then(
  ({ researchers, institutions, institutionNames, modules }) => {
    // Création de panes pour institutions et modules
    const createPanes = (institutions, modules) => {
      institutions.forEach((institution) => {
        map.createPane(`institution-${institution.name}`);
      });
      modules.forEach((module) => {
        map.createPane(`module-${module}`);
      });
    };

    createPanes(institutions, modules);

    // Fonction pour ajouter des marqueurs pour chaque institution
    const addMarkers = (institutions, researchers) => {
      const institutionPositions = {};
      institutions.forEach((institution) => {
        institutionPositions[institution.name] = {
          latitude: institution.latitude,
          longitude: institution.longitude,
        };

        if (
          !institution.latitude ||
          !institution.longitude ||
          institution.longitude === "undefined" ||
          institution.latitude === "undefined"
        ) {
          return;
        }

        const iconSize = calculateIconSize(
          researchers.filter((r) => r.institution === institution.name).length
        );

        const customIcon = L.icon({
          iconUrl: "/src/icons/blue-circle.svg",
          iconSize: iconSize,
          iconAnchor: [iconSize[0] / 2, iconSize[1]],
          popupAnchor: [0, -iconSize[1]],
        });

        const marker = L.marker([institution.latitude, institution.longitude], {
          icon: customIcon,
          pane: `institution-${institution.name}`,
        })
          .addTo(map)
          .bindPopup(institution.name);

        marker.on("mouseover", () => {
          marker.openPopup();
        });

        marker.on("click", () => {
          const researchersForInstitution = researchers.filter(
            (r) => r.institution === institution.name
          );
          displayRelations(institution, researchersForInstitution);
        });
      });
    };

    // Fonction pour mettre à jour les positions des éléments en fonction du zoom et du déplacement
    const updatePositions = () => {
      researchers.forEach((researcher) => {
        const pane = map.getPane(`module-${researcher.module}`);
        const institution = institutions.find(
          (inst) => inst.name === researcher.institution
        );

        if (
          !institution ||
          !institution.latitude ||
          !institution.longitude ||
          institution.longitude === "undefined" ||
          institution.latitude === "undefined"
        ) {
          console.warn(
            `Skipping researcher ${researcher.name} due to missing institution coordinates`
          );
          return;
        }

        const iconSize = calculateIconSize(1); // Taille fixe pour chaque chercheur

        const customIcon = L.icon({
          iconUrl: "/src/icons/blue-circle.svg",
          iconSize: iconSize,
          iconAnchor: [iconSize[0] / 2, iconSize[1]],
          popupAnchor: [0, -iconSize[1]],
        });

        L.marker([institution.latitude, institution.longitude], {
          icon: customIcon,
          pane: pane ? pane.name : undefined,
        })
          .addTo(map)
          .bindPopup(researcher.name);
      });
    };

    // Fonction pour afficher les relations entre les chercheurs
    const displayRelations = (institution, researchers) => {
      const overlay = d3.select(map.getPanes().overlayPane).select("svg");
      let researcherGroup = overlay.select(".leaflet-zoom-hide");

      if (researcherGroup.empty()) {
        researcherGroup = overlay
          .append("g")
          .attr("class", "leaflet-zoom-hide");
      } else {
        researcherGroup.selectAll("*").remove(); // Effacer le réseau existant
      }

      const center = map.latLngToLayerPoint([
        institution.latitude,
        institution.longitude,
      ]);

      const radius = 100;
      const angleStep = (2 * Math.PI) / researchers.length;
      const researcherNodes = researchers.map((researcher, index) => ({
        name: researcher.name,
        x: center.x + radius * Math.cos(index * angleStep),
        y: center.y + radius * Math.sin(index * angleStep),
      }));

      // Ajouter les liens (edges) entre l'institution et les chercheurs
      researcherGroup
        .selectAll("line")
        .data(researcherNodes)
        .enter()
        .append("line")
        .attr("x1", center.x)
        .attr("y1", center.y)
        .attr("x2", (d) => d.x)
        .attr("y2", (d) => d.y)
        .attr("stroke", "black")
        .attr("stroke-width", 1);

      // Ajouter les cercles et les noms pour les chercheurs
      const nodes = researcherGroup
        .selectAll("g")
        .data(researcherNodes)
        .enter()
        .append("g");

      nodes
        .append("circle")
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr("r", 7)
        .attr("fill", "#61b2e4")
        .attr("opacity", 0.7)
        .attr("stroke", "grey");

      nodes
        .append("rect")
        .attr("x", (d) => d.x + 9)
        .attr("y", (d) => d.y - 11)
        .attr("width", (d) => d.name.length * 6.2)
        .attr("height", 14)
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("stroke", "rgba(128, 128, 128, 0.7)")
        .attr("fill", "white");

      nodes
        .append("text")
        .attr("x", (d) => d.x + 12)
        .attr("y", (d) => d.y + 2)
        .text((d) => d.name)
        .attr("class", "researcher-label");

      researcherGroup
        .selectAll("line")
        .attr("x1", center.x)
        .attr("y1", center.y)
        .attr("x2", (d) => center.x + (d.x - center.x))
        .attr("y2", (d) => center.y + (d.y - center.y));

      researcherGroup
        .selectAll("circle")
        .attr("cx", (d) => center.x + (d.x - center.x))
        .attr("cy", (d) => center.y + (d.y - center.y));

      researcherGroup
        .selectAll("rect")
        .attr("x", (d) => center.x + (d.x - center.x) + 9)
        .attr("y", (d) => center.y + (d.y - center.y) - 11);

      researcherGroup
        .selectAll("text")
        .attr("x", (d) => center.x + (d.x - center.x) + 12)
        .attr("y", (d) => center.y + (d.y - center.y) + 2);
    };

    // Fonction pour afficher les chercheurs dans les panes appropriées
    const showResearchersInPanes = (researchers) => {
      researchers.forEach((researcher) => {
        const pane = map.getPane(`module-${researcher.module}`);
        const institution = institutions.find(
          (inst) => inst.name === researcher.institution
        );

        if (
          !institution ||
          !institution.latitude ||
          !institution.longitude ||
          institution.longitude === "undefined" ||
          institution.latitude === "undefined"
        ) {
          return;
        }

        const iconSize = calculateIconSize(1); // Taille fixe pour chaque chercheur

        const customIcon = L.icon({
          iconUrl: "/src/icons/blue-circle.svg",
          iconSize: iconSize,
          iconAnchor: [iconSize[0] / 2, iconSize[1]],
          popupAnchor: [0, -iconSize[1]],
        });

        L.marker([institution.latitude, institution.longitude], {
          icon: customIcon,
          pane: pane ? pane.name : undefined,
        })
          .addTo(map)
          .bindPopup(researcher.name);
      });
    };

    // Fonction pour filtrer les chercheurs
    const checkboxes = document.querySelectorAll(".module-filter");
    const selectedModules = Array.from(checkboxes)
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);
    if (selectedModules.length > 0) {
      const pane = map.getPane(`module-${researchers.module}`);
      //passer le pane en "block"
      if (pane) {
        pane.style.display = moduleFilter.includes(researchers.module)
          ? "block"
          : "none";
      }
    }

    const filterResearchers = (moduleFilter) => {
      researchers.forEach((researcher) => {
        const pane = map.getPane(`module-${researcher.module}`);
        const institution = institutions.find(
          (inst) => inst.name === researcher.institution
        );

        if (
          !institution ||
          !institution.latitude ||
          !institution.longitude ||
          institution.longitude === "undefined" ||
          institution.latitude === "undefined"
        ) {
          console.warn(
            `Skipping researcher ${researcher.name} due to missing institution coordinates`
          );
          return; // Ignorer les chercheurs sans coordonnées d'institution
        }

        if (pane) {
          pane.style.display = moduleFilter.includes(researcher.module)
            ? "block"
            : "none";
        }
      });
    };

    // Initialisation des filtres
    document.querySelectorAll(".module-filter").forEach((checkbox) => {
      checkbox.checked = false;
      checkbox.addEventListener("change", () => {
        const selectedModules = Array.from(
          document.querySelectorAll(".module-filter:checked")
        ).map((cb) => cb.value);
        filterResearchers(selectedModules);
      });
    });

    document.getElementById("reset-filters").addEventListener("click", () => {
      document.querySelectorAll(".module-filter").forEach((checkbox) => {
        checkbox.checked = false;
      });
      filterResearchers([]);
    });

    // Ajouter les marqueurs initiaux et afficher les chercheurs dans les panes
    addMarkers(institutions, researchers);
    showResearchersInPanes(researchers);

    // Mettre à jour les positions lors du zoom et du déplacement de la carte
    map.on("zoomend", updatePositions);
    map.on("moveend", updatePositions);
  }
);
