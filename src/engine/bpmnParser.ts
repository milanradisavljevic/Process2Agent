import type { ProcessElement } from '../types';

const SUPPORTED_ELEMENTS = new Set([
  'task',
  'userTask',
  'serviceTask',
  'scriptTask',
  'manualTask',
  'businessRuleTask',
  'sendTask',
  'receiveTask',
  'exclusiveGateway',
  'parallelGateway',
  'inclusiveGateway',
  'startEvent',
  'endEvent',
  'intermediateCatchEvent',
  'intermediateThrowEvent',
  'subProcess',
  'callActivity',
]);

export function parseBpmnElements(xml: string): ProcessElement[] {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const parserError = document.querySelector('parsererror');

  if (parserError) {
    throw new Error('Die BPMN-Datei konnte nicht als XML gelesen werden.');
  }

  const laneAssignments = readLaneAssignments(document);
  const elements = Array.from(document.querySelectorAll('[id]'))
    .filter((node) => SUPPORTED_ELEMENTS.has(node.localName))
    .map((node) => toProcessElement(node, laneAssignments))
    .filter((element) => !element.bpmnType.endsWith(':SequenceFlow'));

  return deduplicate(elements);
}

function toProcessElement(node: Element, laneAssignments: Map<string, string>): ProcessElement {
  const id = node.getAttribute('id') ?? crypto.randomUUID();
  const normalizedName = readNormalizedName(node, id);

  return {
    id,
    name: normalizedName.name,
    bpmnType: toBpmnType(node.localName),
    laneName: laneAssignments.get(id),
    source: normalizedName.source,
  };
}

function toBpmnType(localName: string): string {
  return `bpmn:${localName.charAt(0).toUpperCase()}${localName.slice(1)}`;
}

function readNormalizedName(node: Element, id: string): Pick<ProcessElement, 'name' | 'source'> {
  const directName = cleanLabel(node.getAttribute('name'));

  if (directName) {
    return { name: directName, source: 'name' };
  }

  const extensionName = findExtensionName(node);

  if (extensionName) {
    return { name: extensionName, source: 'extension' };
  }

  return { name: cleanTechnicalId(id), source: 'id' };
}

function findExtensionName(node: Element): string | undefined {
  const attributes = Array.from(node.attributes)
    .map((attribute) => cleanLabel(attribute.value))
    .find((value) => value && looksLikeHumanLabel(value));

  if (attributes) {
    return attributes;
  }

  const extensionElements = Array.from(node.querySelectorAll('*'));

  return extensionElements
    .map((element) => cleanLabel(element.textContent))
    .find((value) => value && looksLikeHumanLabel(value));
}

function readLaneAssignments(document: XMLDocument): Map<string, string> {
  const assignments = new Map<string, string>();

  Array.from(document.getElementsByTagNameNS('*', 'lane')).forEach((lane) => {
    const laneName = cleanLabel(lane.getAttribute('name')) ?? cleanTechnicalId(lane.getAttribute('id') ?? 'Lane');
    Array.from(lane.getElementsByTagNameNS('*', 'flowNodeRef')).forEach((reference) => {
      const elementId = cleanLabel(reference.textContent);

      if (elementId) {
        assignments.set(elementId, laneName);
      }
    });
  });

  return assignments;
}

function cleanLabel(value: string | null): string | undefined {
  const cleaned = value?.replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned : undefined;
}

function cleanTechnicalId(id: string): string {
  return id
    .replace(/^sid[-_]?/i, '')
    .replace(/^[a-f0-9-]{12,}$/i, 'Unbenannter Schritt')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function looksLikeHumanLabel(value: string): boolean {
  return value.length > 2 && !/^[a-f0-9-]{12,}$/i.test(value) && !/^https?:\/\//i.test(value);
}

function deduplicate(elements: ProcessElement[]): ProcessElement[] {
  const seen = new Set<string>();
  return elements.filter((element) => {
    if (seen.has(element.id)) {
      return false;
    }

    seen.add(element.id);
    return true;
  });
}
