import type React from "react";
import * as alert from "@/registry/sahajiv/ui/alert";
import * as aspect_ratio from "@/registry/sahajiv/ui/aspect-ratio";
import * as avatar from "@/registry/sahajiv/ui/avatar";
import * as bubble from "@/registry/sahajiv/ui/bubble";
import * as empty from "@/registry/sahajiv/ui/empty";
import * as item from "@/registry/sahajiv/ui/item";
import * as kbd from "@/registry/sahajiv/ui/kbd";
import * as label from "@/registry/sahajiv/ui/label";
import * as marker from "@/registry/sahajiv/ui/marker";
import * as message from "@/registry/sahajiv/ui/message";
import * as progress from "@/registry/sahajiv/ui/progress";
import * as separator from "@/registry/sahajiv/ui/separator";
import * as skeleton from "@/registry/sahajiv/ui/skeleton";
import * as spinner from "@/registry/sahajiv/ui/spinner";
import * as typography from "@/registry/sahajiv/ui/typography";
import {Button,ButtonIndicator} from "@/registry/sahajiv/ui/button";
import {Badge} from "@/registry/sahajiv/ui/badge";
import * as CardParts from "@/registry/sahajiv/ui/card";
import {Direction} from "@/registry/sahajiv/ui/direction";
import {Icon,IconButton,Disk} from "@/registry/sahajiv/ui/icon";
import {Shape} from "@/registry/sahajiv/ui/shape";

export type FixtureComponent = {Component:React.ElementType;polymorphic?:boolean};
export const staticComponents:Record<string,FixtureComponent>={
"v-alert": {Component:alert.Alert,polymorphic:true},
"v-alert__body": {Component:alert.AlertBody,polymorphic:true},
"v-alert__title": {Component:alert.AlertTitle,polymorphic:true},
"v-alert__text": {Component:alert.AlertDescription,polymorphic:true},
"v-alert__kicker": {Component:alert.AlertKicker,polymorphic:true},
"v-alert__blob": {Component:alert.AlertIcon,polymorphic:true},
"v-alert__actions": {Component:alert.AlertActions,polymorphic:true},
"v-alert__close": {Component:alert.AlertClose,polymorphic:true},
"v-ratio": {Component:aspect_ratio.AspectRatio,polymorphic:false},
"v-avatar": {Component:avatar.Avatar,polymorphic:false},
"v-avatar-stack": {Component:avatar.AvatarGroup,polymorphic:false},
"v-avatar-wrap": {Component:avatar.AvatarWrapper,polymorphic:false},
"v-edit": {Component:avatar.AvatarEdit,polymorphic:false},
"v-hex": {Component:avatar.AvatarHex,polymorphic:false},
"v-hexgroup": {Component:avatar.AvatarHexGroup,polymorphic:false},
"v-more": {Component:avatar.AvatarMore,polymorphic:false},
"v-chat": {Component:bubble.Bubble,polymorphic:true},
"v-chat__row": {Component:bubble.BubbleRow,polymorphic:true},
"v-bubble": {Component:bubble.BubbleContent,polymorphic:true},
"v-chat__gap": {Component:bubble.BubbleGap,polymorphic:true},
"v-chat__time": {Component:bubble.BubbleTime,polymorphic:true},
"v-empty": {Component:empty.Empty,polymorphic:true},
"v-empty__title": {Component:empty.EmptyTitle,polymorphic:true},
"v-empty__text": {Component:empty.EmptyDescription,polymorphic:true},
"v-state": {Component:empty.EmptyState,polymorphic:true},
"v-state__word": {Component:empty.EmptyStateTitle,polymorphic:true},
"v-state__why": {Component:empty.EmptyStateDescription,polymorphic:true},
"v-item": {Component:item.Item,polymorphic:true},
"v-list": {Component:item.ItemGroup,polymorphic:true},
"v-item__body": {Component:item.ItemContent,polymorphic:true},
"v-item__title": {Component:item.ItemTitle,polymorphic:true},
"v-item__sub": {Component:item.ItemDescription,polymorphic:true},
"v-time": {Component:item.ItemTrailing,polymorphic:true},
"v-kbd": {Component:kbd.Kbd,polymorphic:true},
"v-label": {Component:label.Label,polymorphic:true},
"v-stats": {Component:label.Stats,polymorphic:true},
"v-stat": {Component:label.Stat,polymorphic:true},
"v-marker": {Component:marker.Marker,polymorphic:true},
"v-msg": {Component:message.Message,polymorphic:true},
"v-msg__stack": {Component:message.MessageContent,polymorphic:true},
"v-prov": {Component:message.MessageDescription,polymorphic:true},
"v-track": {Component:progress.Progress,polymorphic:false},
"v-sep": {Component:separator.Separator,polymorphic:false},
"v-skel": {Component:skeleton.Skeleton,polymorphic:true},
"v-skel-group": {Component:skeleton.SkeletonGroup,polymorphic:true},
"v-async": {Component:skeleton.AsyncContent,polymorphic:true},
"v-async__row": {Component:skeleton.AsyncRow,polymorphic:true},
"v-quiet": {Component:skeleton.Quiet,polymorphic:true},
"v-pulse": {Component:spinner.Spinner,polymorphic:false},
"v-pulse__label": {Component:spinner.SpinnerLabel,polymorphic:false},
"v-prose": {Component:typography.Typography,polymorphic:true},
"v-hero": {Component:typography.Hero,polymorphic:true},
"v-display": {Component:typography.Display,polymorphic:true},
"v-section": {Component:typography.SectionTitle,polymorphic:true},
"v-title": {Component:typography.Title,polymorphic:true},
"v-lead": {Component:typography.Lead,polymorphic:true},
"v-body": {Component:typography.Body,polymorphic:true},
"v-body-2": {Component:typography.BodySecondary,polymorphic:true},
"v-control": {Component:typography.ControlText,polymorphic:true},
"v-meta": {Component:typography.Meta,polymorphic:true},
"v-caps": {Component:typography.Caps,polymorphic:true},
"v-value": {Component:typography.Value,polymorphic:true},
"v-id": {Component:typography.Identifier,polymorphic:true},
"v-btn":{Component:Button},"v-badge":{Component:Badge},"v-card":{Component:CardParts.Card},"v-card__title":{Component:CardParts.CardTitle},"v-ibtn":{Component:IconButton},"v-disk":{Component:Disk}
};
export {Icon,Shape,Direction,ButtonIndicator};
