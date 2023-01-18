export interface RelatedMap {
  imageUrl: string;
  url: string;
  title: string;
  description: string;
}

export const defaultRelatedMaps: RelatedMap[] = [
  {
    imageUrl:
      "images/related/megalithic_logo_150.gif",
    url: "https://www.megalithic.co.uk",
    title: "The Megalithic Portal",
    description:
      "The top destination for Megaliths and Prehistory worldwide. World-wide Ancient Site Database, Photos and Prehistoric Archaeology News with geolocation."
  },
  {
    imageUrl:
      "images/related/antarctica.png",
    url: "https://antarctica.hidden-history.ch",
    title: "Antarctica and beyond",
    description:
      "Map and Timeline of Antarctica"
  },
];
