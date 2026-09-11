"use client";
import Link from "next/link";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/registry/cojeev/ui/accordion";
import { SectionTitle, Meta } from "@/registry/cojeev/ui/typography";

export function LaunchFaq() {
  return <section className="launch-faq story-section" aria-labelledby="faq-heading">
    <div><Meta>A few useful answers</Meta><SectionTitle id="faq-heading">Before you<br />make it yours.</SectionTitle></div>
    <Accordion type="single" collapsible>
      <AccordionItem value="ownership"><AccordionTrigger>Can I use these in a commercial project?</AccordionTrigger><AccordionContent>Yes. The library is MIT licensed. Keep the included license and attribution notices; fonts and adapted work retain their own notices.</AccordionContent></AccordionItem>
      <AccordionItem value="installation"><AccordionTrigger>How do I add a component?</AccordionTrigger><AccordionContent>Use the install command on its page. The shadcn CLI copies its source and dependencies into your project, where you can change them. <Link href="/getting-started/">Follow the setup guide.</Link></AccordionContent></AccordionItem>
      <AccordionItem value="motion"><AccordionTrigger>What if I prefer less motion?</AccordionTrigger><AccordionContent>Use the motion settings in the navigation, or your device’s reduced-motion preference. Each component’s documentation describes its behavior and available controls.</AccordionContent></AccordionItem>
      <AccordionItem value="tracking"><AccordionTrigger>Does installed code track my users?</AccordionTrigger><AccordionContent>No. Website analytics stays on this website. The components you install contain no analytics service or tracking callbacks to us. <Link href="/privacy/">Read about website privacy.</Link></AccordionContent></AccordionItem>
      <AccordionItem value="requests"><AccordionTrigger>Can I suggest something?</AccordionTrigger><AccordionContent>Yes. <Link href="/requests/">Explore the request board</Link>, or open an issue in the public repository. Specific examples and a little context help shape the next addition.</AccordionContent></AccordionItem>
    </Accordion>
  </section>;
}
