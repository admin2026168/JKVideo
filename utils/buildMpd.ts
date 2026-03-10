export function buildMpd(
  videoUrl: string,
  videoCodecs: string,
  videoBandwidth: number,
  audioUrl: string,
  audioCodecs: string,
  audioBandwidth: number,
): string {
  return `<?xml version="1.0"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011" type="static" mediaPresentationDuration="PT9999S">
  <Period>
    <AdaptationSet contentType="video" mimeType="video/mp4" segmentAlignment="true">
      <Representation id="v1" codecs="${videoCodecs}" bandwidth="${videoBandwidth}">
        <BaseURL>${videoUrl}</BaseURL>
        <SegmentBase><Initialization range="0-999"/></SegmentBase>
      </Representation>
    </AdaptationSet>
    <AdaptationSet contentType="audio" mimeType="audio/mp4">
      <Representation id="a1" codecs="${audioCodecs}" bandwidth="${audioBandwidth}">
        <BaseURL>${audioUrl}</BaseURL>
        <SegmentBase><Initialization range="0-999"/></SegmentBase>
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>`;
}
