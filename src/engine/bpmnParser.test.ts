import { describe, expect, it } from 'vitest';
import { parseBpmnElements } from './bpmnParser';
import demoXml from '../../demo_produktlaunch.bpmn?raw';

const VALID_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="P1">
    <laneSet>
      <lane id="Lane_1" name="Einkauf">
        <flowNodeRef>Task_1</flowNodeRef>
      </lane>
    </laneSet>
    <startEvent id="Start_1" name="Start" />
    <userTask id="Task_1" name="Bestellung prüfen">
      <documentation>Freigabe durch Teamleiter bei Betrag &gt; 1000 EUR.</documentation>
    </userTask>
    <serviceTask id="Task_2" />
    <exclusiveGateway id="GW_1" name="Betrag &gt; 1000?" />
    <endEvent id="End_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_1" />
    <sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="GW_1" />
    <task id="sid-A1B2C3D4E5F6" />
  </process>
</definitions>`;

describe('parseBpmnElements', () => {
  it('extrahiert unterstützte Elemente und ignoriert SequenceFlows', () => {
    const elements = parseBpmnElements(VALID_BPMN);
    const types = elements.map((el) => el.bpmnType);

    expect(types).toContain('bpmn:UserTask');
    expect(types).toContain('bpmn:ServiceTask');
    expect(types).toContain('bpmn:ExclusiveGateway');
    expect(types.every((type) => !type.endsWith('SequenceFlow'))).toBe(true);
  });

  it('liest Namen, Lanes und Documentation', () => {
    const elements = parseBpmnElements(VALID_BPMN);
    const task = elements.find((el) => el.id === 'Task_1');

    expect(task?.name).toBe('Bestellung prüfen');
    expect(task?.laneName).toBe('Einkauf');
    expect(task?.source).toBe('name');
    expect(task?.documentation).toContain('Teamleiter');
  });

  it('behandelt technische IDs aktuell als Extension-Namen (bekannter Quirk, Fix in Phase 1)', () => {
    const elements = parseBpmnElements(VALID_BPMN);
    const unnamed = elements.find((el) => el.id === 'sid-A1B2C3D4E5F6');

    expect(unnamed?.source).toBe('extension');
    expect(unnamed?.name.length).toBeGreaterThan(0);
  });

  it('nutzt Attribut-Fallback für Tasks ohne name-Attribut', () => {
    const elements = parseBpmnElements(VALID_BPMN);
    const service = elements.find((el) => el.bpmnType === 'bpmn:ServiceTask');

    expect(service?.source).toBe('extension');
    expect(service?.name).toBe('Task_2');
  });

  it('dedupliziert Elemente nach ID', () => {
    const duplicated = VALID_BPMN.replace(
      '<endEvent id="End_1" />',
      '<endEvent id="End_1" /><userTask id="Task_1" name="Duplikat" />',
    );
    const elements = parseBpmnElements(duplicated);

    expect(elements.filter((el) => el.id === 'Task_1')).toHaveLength(1);
  });

  it('wirft eine verständliche Fehlermeldung bei invalidem XML', () => {
    expect(() => parseBpmnElements('<definitions><process>')).toThrow('XML');
  });

  it('parst die Demo-Prozessdatei ohne Fehler', () => {
    const elements = parseBpmnElements(demoXml);

    expect(elements.length).toBeGreaterThanOrEqual(15);
    const laneNames = new Set(elements.map((el) => el.laneName));
    expect(laneNames.size).toBeGreaterThanOrEqual(4);
  });
});
