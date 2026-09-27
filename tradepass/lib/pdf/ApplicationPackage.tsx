// The full evidence package for a worker: summary stamp, hours/skill-set coverage,
// worker's own intake claims, per-verification audit trails, and an appendix of
// English interview transcripts.
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, PdfHeader, PdfFooter } from './PdfLayout';
import { REQUIRED_HOURS_309A } from '../skills/309A';
import { hoursFor, monthEn } from '../hours';
import type { Assessment, Employment, VerificationRequest, Worker } from '../types';

function EmploymentHoursTable({ employments }: { employments: Employment[] }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <Text style={styles.tableHeaderCell}>Employer</Text>
        <Text style={styles.tableHeaderCell}>Dates</Text>
        <Text style={[styles.tableHeaderCell, { flex: 0.6 }]}>Claimed hrs</Text>
        <Text style={[styles.tableHeaderCell, { flex: 0.6 }]}>Status</Text>
      </View>
      {employments.map((e, i, arr) => {
        const claimed = hoursFor(e.startDate, e.endDate, e.hoursPerWeek);
        const isLast = i === arr.length - 1;
        return (
          <View key={e.id} style={isLast ? styles.tableRowLast : styles.tableRow}>
            <Text style={styles.tableCell}>{e.employerName}</Text>
            <Text style={styles.tableCell}>{monthEn(e.startDate)} – {e.endDate ? monthEn(e.endDate) : 'Present'}</Text>
            <Text style={[styles.tableCell, { flex: 0.6 }]}>{claimed.toLocaleString('en-CA')}</Text>
            <Text style={[styles.tableCell, { flex: 0.6 }]}>{e.status}</Text>
          </View>
        );
      })}
    </View>
  );
}

function SkillSetTable({ assessment }: { assessment: Assessment }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <Text style={[styles.tableHeaderCell, { flex: 0.4 }]}>Code</Text>
        <Text style={styles.tableHeaderCell}>Title</Text>
        <Text style={[styles.tableHeaderCell, { flex: 0.7 }]}>Status</Text>
      </View>
      {assessment.coverage.map((c, i, arr) => {
        const isLast = i === arr.length - 1;
        return (
          <View key={c.skillSetId} style={isLast ? styles.tableRowLast : styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 0.4 }]}>{c.code}{c.provisional ? '*' : ''}</Text>
            <Text style={styles.tableCell}>{c.title}</Text>
            <Text style={[styles.tableCell, { flex: 0.7 }]}>{c.status}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function ApplicationPackage({
  worker,
  employments,
  requests,
  assessment,
}: {
  worker: Worker;
  employments: Employment[];
  requests: VerificationRequest[];
  assessment: Assessment;
}) {
  const completedRequests = requests.filter((r) => r.status === 'completed' && r.result);

  return (
    <Document>
      {/* Page 1: Summary */}
      <Page size="A4" style={styles.page}>
        <PdfHeader subtitle="Application Evidence Package — Summary" />
        <Text style={styles.h1}>{worker.name}</Text>
        <Text style={styles.p}>309A Construction &amp; Maintenance Electrician · {worker.contractorName}</Text>

        <View style={{ marginTop: 12, marginBottom: 12 }}>
          <Text style={assessment.readyToSubmit ? styles.badgeGreen : styles.badgeAmber}>
            {assessment.readyToSubmit ? 'READY TO SUBMIT' : 'NOT READY'}
          </Text>
        </View>

        <Text style={styles.h2}>Hours</Text>
        <View style={styles.row}><Text style={styles.label}>Verified hours</Text><Text style={styles.value}>{assessment.verifiedHours.toLocaleString('en-CA')}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Claimed hours</Text><Text style={styles.value}>{assessment.claimedHours.toLocaleString('en-CA')}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Required hours</Text><Text style={styles.value}>{REQUIRED_HOURS_309A.toLocaleString('en-CA')}</Text></View>

        <Text style={styles.h2}>Skill-set coverage</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Verified</Text>
          <Text style={styles.value}>{assessment.verifiedCount} / {assessment.totalSkillSets}</Text>
        </View>

        {assessment.blockers.length > 0 && (
          <>
            <Text style={styles.h2}>Blockers</Text>
            <View style={styles.boxAmber}>
              {assessment.blockers.map((b, i) => (
                <Text key={i} style={styles.p}>• {b}</Text>
              ))}
            </View>
          </>
        )}

        <PdfFooter />
      </Page>

      {/* Page 2: Hours by employment + skill-set coverage table */}
      <Page size="A4" style={styles.page}>
        <PdfHeader subtitle="Hours and Skill-Set Coverage" />
        <Text style={styles.h2}>Hours by employment</Text>
        <EmploymentHoursTable employments={employments} />

        <Text style={styles.h2}>309A skill-set coverage</Text>
        <SkillSetTable assessment={assessment} />
        <Text style={styles.small}>* Provisional grouping — titles to be confirmed against the official STO 309A standard.</Text>

        <PdfFooter />
      </Page>

      {/* Page 3: Worker's intake (claimed) */}
      <Page size="A4" style={styles.page}>
        <PdfHeader subtitle="Worker's Own Claims (Intake)" />
        <Text style={styles.h2}>Worker&apos;s intake</Text>
        {worker.intake ? (
          <>
            <View style={styles.row}><Text style={styles.label}>Mode</Text><Text style={styles.value}>{worker.intake.mode}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Conversation ID</Text><Text style={styles.value}>{worker.intake.conversationId ?? 'n/a'}</Text></View>
            <Text style={[styles.small, { marginTop: 8, marginBottom: 4 }]}>
              The following is the worker&apos;s own account of their work history, in English translation. It is
              labelled as a CLAIM and has not been independently verified except where a corresponding employer
              verification exists elsewhere in this package.
            </Text>
            <View style={styles.box}>
              {worker.intake.transcript.map((line, i) => (
                <Text key={i} style={styles.p}>
                  <Text style={{ fontWeight: 'bold' }}>{line.speaker}: </Text>
                  {line.english ?? line.original}
                </Text>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.p}>No voice intake on file for this worker.</Text>
        )}
        <PdfFooter />
      </Page>

      {/* Page 4: Audit trail per verification */}
      <Page size="A4" style={styles.page}>
        <PdfHeader subtitle="Audit Trail" />
        <Text style={styles.h2}>Audit trail per verification</Text>
        {completedRequests.length === 0 && <Text style={styles.p}>No completed verifications yet.</Text>}
        {completedRequests.map((r) => {
          const employment = employments.find((e) => e.id === r.employmentId);
          return (
            <View key={r.id} style={styles.box}>
              <Text style={[styles.p, { fontWeight: 'bold' }]}>{employment?.employerName ?? r.employmentId}</Text>
              <View style={styles.row}><Text style={styles.label}>Outcome</Text><Text style={styles.value}>{r.result?.outcome}</Text></View>
              <View style={styles.row}><Text style={styles.label}>IP</Text><Text style={styles.value}>{r.audit.ip ?? '—'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>User agent</Text><Text style={styles.value}>{r.audit.userAgent ?? '—'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Client timezone</Text><Text style={styles.value}>{r.audit.clientTimezone ?? '—'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Mode</Text><Text style={styles.value}>{r.audit.interviewMode ?? '—'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Conversation ID</Text><Text style={styles.value}>{r.audit.conversationId ?? '—'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Transcript source</Text><Text style={styles.value}>{r.audit.transcriptSource ?? '—'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Video SHA-256</Text><Text style={styles.value}>{r.audit.videoSha256 ?? '—'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Video bytes</Text><Text style={styles.value}>{r.audit.videoBytes?.toLocaleString('en-CA') ?? '—'}</Text></View>
            </View>
          );
        })}
        <PdfFooter />
      </Page>

      {/* Appendix: English interview transcripts */}
      <Page size="A4" style={styles.page}>
        <PdfHeader subtitle="Appendix — English Interview Transcripts" />
        <Text style={styles.h2}>Appendix: English interview transcripts</Text>
        {completedRequests.length === 0 && <Text style={styles.p}>No completed verifications yet.</Text>}
        {completedRequests.map((r) => {
          const employment = employments.find((e) => e.id === r.employmentId);
          return (
            <View key={r.id} style={{ marginBottom: 12 }}>
              <Text style={[styles.p, { fontWeight: 'bold' }]}>{employment?.employerName ?? r.employmentId}</Text>
              <View style={styles.box}>
                {r.transcript.map((line, i) => (
                  <Text key={i} style={styles.p}>
                    <Text style={{ fontWeight: 'bold' }}>{line.speaker}: </Text>
                    {line.english ?? 'translation unavailable'}
                  </Text>
                ))}
              </View>
            </View>
          );
        })}
        <PdfFooter />
      </Page>
    </Document>
  );
}
